import React, { useState, useEffect } from "react";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import WalletSummary from "@/components/dashboard/WalletSummary";
import CreateChallenge from "@/components/dashboard/CreateChallenge";
import OngoingChallenges from "@/components/dashboard/OngoingChallenges";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import { useWeb3 } from "@/context/Web3Provider";
import { ethers } from "ethers";

interface Challenge {
  id: string;
  creator: string;
  player1: string;
  player2: string;
  stakedAmount: number;
  totalStake: number;
  isActive: boolean;
  track?: string;
  milestones?: string[];
}

interface WalletSummary {
  totalStaked: number;
  ongoingChallenges: number;
  totalWinnings: number;
  milestonesCompleted: number;
}

interface NewChallenge {
  player1: string;
  player2: string;
  stakeAmount: string;
  track: string;
}

interface OngoingChallengesProps {
  challenges: Challenge[];
  isLoading: boolean;
  userAddress: string;
}

interface WalletSummaryProps {
  totalStaked: number;
  ongoingChallenges: number;
  totalWinnings: number;
  milestonesCompleted: number;
}

interface CreateChallengeProps {
  onCreateChallenge: (newChallenge: NewChallenge) => Promise<void>;
}

interface OngoingChallengeItem {
  id: string;
  name: string;
  stakedAmount: number;
  participants: {
    address: string;
    avatar: string;
  }[];
  nextMilestoneDate: Date;
  progress: number;
  track: string;
}

const Dashboard = () => {
  const { wallet, contract, isConnected } = useWeb3();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [ongoingChallenges, setOngoingChallenges] = useState<OngoingChallengeItem[]>([]);
  const [summary, setSummary] = useState<WalletSummary>({
    totalStaked: 0,
    ongoingChallenges: 0,
    totalWinnings: 0,
    milestonesCompleted: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("Wallet:", wallet);
    console.log("Is Connected:", isConnected);
    console.log("Contract:", contract);
  }, [wallet, isConnected, contract]);

  useEffect(() => {
    const init = async () => {
      if (wallet) {
        await fetchChallenges();
      }
    };
    init();
  }, [wallet]);

  const fetchChallenges = async () => {
    if (!contract || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsLoading(true);
    try {
      const challengeCount = await contract.challengeCounter();
      const fetchedChallenges: Challenge[] = [];

      const challengePromises = Array.from({ length: Number(challengeCount) }, (_, i) =>
        fetchChallengeDetails(i)
      );

      const resolvedChallenges = await Promise.all(challengePromises);
      setChallenges(resolvedChallenges.filter(Boolean) as Challenge[]);

      updateSummary(resolvedChallenges.filter(Boolean) as Challenge[]);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Failed to fetch challenges. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChallengeDetails = async (index: number): Promise<Challenge | null> => {
    try {
      const challenge = await contract.challenges(index);
      if (!challenge) return null;

      return {
        id: index.toString(),
        creator: challenge.creator,
        player1: challenge.player1,
        player2: challenge.player2,
        stakedAmount: Number(ethers.formatEther(challenge.stakedAmount)),
        totalStake: Number(ethers.formatEther(challenge.totalStake)),
        isActive: challenge.isActive,
        track: challenge.track || "",
        milestones: challenge.milestones || [],
      };
    } catch (error) {
      console.error(`Error fetching challenge ${index}:`, error);
      return null;
    }
  };

  const updateSummary = (fetchedChallenges: Challenge[]) => {
    const summary = fetchedChallenges.reduce(
      (acc, challenge) => {
        if (challenge.isActive && (challenge.player1 === wallet || challenge.player2 === wallet)) {
          acc.totalStaked += challenge.stakedAmount;
          acc.ongoingChallenges += 1;
        }
        return acc;
      },
      {
        totalStaked: 0,
        ongoingChallenges: 0,
        totalWinnings: 0,
        milestonesCompleted: 0,
      }
    );

    setSummary(summary);
  };

  useEffect(() => {
    if (challenges.length > 0) {
      const convertedChallenges = challenges.map(challenge => ({
        id: challenge.id,
        name: `Challenge ${challenge.id}`,
        stakedAmount: challenge.stakedAmount,
        participants: [
          {
            address: challenge.player1,
            avatar: `https://robohash.org/${challenge.player1}.png`,
          },
          {
            address: challenge.player2,
            avatar: `https://robohash.org/${challenge.player2}.png`,
          }
        ],
        nextMilestoneDate: new Date(),
        progress: 0,
        track: challenge.track || "General",
      }));
      
      setOngoingChallenges(convertedChallenges);
    }
  }, [challenges]);

  const handleCreateChallenge = async (newChallenge: NewChallenge) => {
    if (!contract || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!ethers.isAddress(newChallenge.player1) || !ethers.isAddress(newChallenge.player2)) {
      toast.error("Invalid wallet addresses provided");
      return;
    }

    try {
      const stakeInWei = ethers.parseEther(newChallenge.stakeAmount);
      
      toast.loading("Creating challenge...");

      const tx = await contract.createChallenge(
        newChallenge.player1,
        newChallenge.player2,
        newChallenge.track,
        {
          value: stakeInWei,
        }
      );

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success("Challenge created successfully!");
        await fetchChallenges();
      } else {
        toast.error("Transaction failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      toast.error(
        error.reason || error.message || "Failed to create challenge. Please try again."
      );
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-web3-background">
        <DashboardNavbar address={wallet} />
        <main className="container mx-auto px-4 py-8 mt-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please connect your wallet</h2>
            <p className="text-white/70">Connect your wallet to view your dashboard</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-web3-background">
      <DashboardNavbar address={wallet} />
      <main className="container mx-auto px-4 py-8 mt-16">
        <WalletSummary />
        <CreateChallenge />
        <OngoingChallenges 
          challenges={ongoingChallenges} 
          isLoading={isLoading}
          userAddress={wallet}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
