import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Sparkles, Users, BookOpen, Calendar } from "lucide-react";
import { useWeb3 } from "@/context/Web3Provider";
import { toast } from "sonner";
import { EDU_CHAIN_CONFIG, getCurrentChainId, handleContractError, switchToEduChain } from "@/lib/utils";

// Track options for the challenge
const TRACKS = [
  { id: "javascript", name: "JavaScript" },
  { id: "solidity", name: "Solidity" },
  { id: "python", name: "Python" },
  { id: "rust", name: "Rust" },
  { id: "react", name: "React" },
];

const CreateChallenge = () => {
  const { contract, wallet, isConnected, getCurrentChainId: getChainIdFromContext, switchToEduChain: switchNetworkFromContext } = useWeb3();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [participants, setParticipants] = useState<string[]>([""]); // Initial empty participant
  const [selectedTrack, setSelectedTrack] = useState("");
  const [errors, setErrors] = useState({
    stakeAmount: "",
    participants: [""],
    track: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission status
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Check if we're on the correct network on component mount and when wallet changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected) {
        const chainId = await getCurrentChainId();
        if (chainId && chainId !== EDU_CHAIN_CONFIG.chainId) {
          setNetworkError(`Please connect to eduChain Testnet (Chain ID: ${EDU_CHAIN_CONFIG.chainId}). Current network is not supported.`);
        } else {
          setNetworkError(null);
        }
      }
    };
    
    checkNetwork();
  }, [isConnected, wallet]);

  // Toggle the form visibility
  const toggleForm = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      resetForm();
    }
  };

  // Reset the form to its initial state
  const resetForm = () => {
    setStakeAmount("");
    setParticipants([""]);
    setSelectedTrack("");
    setErrors({
      stakeAmount: "",
      participants: [""],
      track: "",
    });
    setIsSubmitting(false);
  };

  // Add a new participant input field
  const addParticipant = () => {
    if (participants.length < 4) { // Max 5 participants (including creator)
      setParticipants([...participants, ""]);
      setErrors({
        ...errors,
        participants: [...errors.participants, ""],
      });
    }
  };

  // Remove a participant input field
  const removeParticipant = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants.splice(index, 1);
    setParticipants(updatedParticipants);

    const updatedErrors = [...errors.participants];
    updatedErrors.splice(index, 1);
    setErrors({
      ...errors,
      participants: updatedErrors,
    });
  };

  // Update a participant's address
  const updateParticipant = (index: number, value: string) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = value;
    setParticipants(updatedParticipants);

    if (value) {
      const updatedErrors = [...errors.participants];
      updatedErrors[index] = "";
      setErrors({
        ...errors,
        participants: updatedErrors,
      });
    }
  };

  // Validate the form fields
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      stakeAmount: "",
      participants: participants.map(() => ""),
      track: "",
    };

    // Validate stake amount
    if (!stakeAmount) {
      newErrors.stakeAmount = "Stake amount is required";
      valid = false;
    } else if (isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      newErrors.stakeAmount = "Please enter a valid amount";
      valid = false;
    }

    // Validate participant addresses
    participants.forEach((participant, index) => {
      if (!participant) {
        newErrors.participants[index] = "Wallet address is required";
        valid = false;
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(participant)) {
        newErrors.participants[index] = "Invalid Ethereum address";
        valid = false;
      }
    });

    // Validate track selection
    if (!selectedTrack) {
      newErrors.track = "Please select a track";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Handle switching to eduChain network
  const handleSwitchNetwork = async () => {
    toast.loading("Switching to eduChain network...");
    try {
      const success = await switchToEduChain();
      if (success) {
        toast.success("Successfully switched to eduChain network!");
        setNetworkError(null);
        return true;
      } else {
        toast.error("Failed to switch to eduChain network");
        return false;
      }
    } catch (error) {
      console.error("Error switching network:", error);
      toast.error("Failed to switch to eduChain network");
      return false;
    } finally {
      toast.dismiss();
    }
  };

  // Handle form submission with blockchain interaction
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Check network before proceeding
    const chainId = await getCurrentChainId();
    if (chainId && chainId !== EDU_CHAIN_CONFIG.chainId) {
      toast.error(`Please connect to eduChain Testnet (Chain ID: ${EDU_CHAIN_CONFIG.chainId})`);
      const switched = await handleSwitchNetwork();
      if (!switched) return;
    }

    setIsSubmitting(true);

    try {
      if (!window.ethereum) {
        throw new Error("No wallet found. Please install MetaMask.");
      }

      if (!contract) {
        throw new Error("Contract not initialized. Please reconnect your wallet.");
      }

      // Convert stake amount to wei
      const stakeInWei = ethers.parseEther(stakeAmount);

      // Filter out empty participants and ensure unique addresses
      const validParticipants = [...new Set(participants.filter(p => p))];
      
      // Set total players to the count of participants plus 1 (including the creator)
      const totalPlayers = validParticipants.length;
      
      // Create milestone timestamps (for simplicity, just using future timestamps)
      const now = Math.floor(Date.now() / 1000);
      const milestoneTimestamps = [
        now + 86400, // 1 day from now
        now + 172800, // 2 days from now
        now + 259200, // 3 days from now
      ];

      toast.loading("Creating challenge...");

      console.log("Calling contract with params:", {
        stakeInWei: stakeInWei.toString(),
        totalPlayers,
        validParticipants,
        milestoneTimestamps,
        track: selectedTrack,
      });

      try {
        // First check if we can estimate gas for the transaction
        // Make sure parameters match the contract ABI exactly
        const tx = await contract.createChallenge(
          stakeInWei, 
          totalPlayers,
          validParticipants, 
          milestoneTimestamps,
          { 
            value: stakeInWei, // Send ETH with the transaction
            gasLimit: 3000000 // Use a high gas limit to ensure the transaction goes through
          }
        );

        toast.loading("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        
        toast.success("Challenge created successfully!");
        console.log("Challenge created successfully. Tx hash:", receipt.hash);

        // Reset form and collapse on success
        resetForm();
        setIsExpanded(false);
      } catch (contractError: any) {
        console.error("Contract interaction error:", contractError);
        
        // Check if we need to switch networks
        if (contractError.message && contractError.message.includes("missing revert data")) {
          toast.error("Transaction would fail. Please ensure you're connected to eduChain Testnet.");
          await handleSwitchNetwork();
        } else {
          // More informative error handling
          const errorMessage = handleContractError(contractError);
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      toast.error(error.message || "Failed to create challenge");
    } finally {
      setIsSubmitting(false);
      toast.dismiss();
    }
  };

  // Create a button to switch networks if needed
  const SwitchNetworkButton = () => {
    if (!networkError) return null;
    
    return (
      <Button 
        onClick={handleSwitchNetwork}
        className="mt-2 w-full bg-red-500 hover:bg-red-600"
      >
        Switch to eduChain Testnet
      </Button>
    );
  };

  return (
    <section className="mb-12">
      {!isExpanded ? (
        <Button
          onClick={toggleForm}
          disabled={isSubmitting}
          className="w-full py-10 flex items-center justify-center gap-3 relative group overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_25px_rgba(248,161,0,0.3)]"
          style={{
            background: "linear-gradient(135deg, #4A90E2 0%, #F8A100 100%)",
          }}
        >
          <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          <PlusCircle className="h-6 w-6 text-white" />
          <span className="text-xl font-semibold">Create a New Challenge</span>
        </Button>
      ) : (
        <Card className="glassmorphism border border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-gradient flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-web3-orange" />
              Create a New Learning Challenge
            </CardTitle>
          </CardHeader>
          <CardContent>
            {networkError && (
              <div className="bg-red-500/20 border border-red-500 p-3 rounded-md mb-4 text-red-200">
                <p className="text-sm font-medium">{networkError}</p>
                <p className="text-xs mt-1">Please switch to eduChain Testnet in your wallet.</p>
                <SwitchNetworkButton />
              </div>
            )}

            <div className="space-y-6">
              {/* Stake Amount */}
              <div className="space-y-2">
                <Label htmlFor="stake-amount" className="text-white">
                  Stake Amount (ETH)
                </Label>
                <div className="relative">
                  <Input
                    id="stake-amount"
                    type="text"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.1"
                    disabled={isSubmitting}
                    className={`bg-web3-card border ${
                      errors.stakeAmount ? "border-web3-orange" : "border-white/10"
                    } text-white placeholder:text-white/50`}
                  />
                  {errors.stakeAmount && (
                    <p className="text-web3-orange text-sm mt-1">{errors.stakeAmount}</p>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white flex items-center">
                    <Users className="h-4 w-4 mr-2 text-web3-blue" />
                    Challenge Participants
                  </Label>
                  {participants.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addParticipant}
                      disabled={isSubmitting}
                      className="text-web3-blue"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add Participant
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={participant}
                          onChange={(e) => updateParticipant(index, e.target.value)}
                          placeholder="0x... (Ethereum Address)"
                          disabled={isSubmitting}
                          className={`bg-web3-card border ${
                            errors.participants[index] ? "border-web3-orange" : "border-white/10"
                          } text-white placeholder:text-white/50`}
                        />
                        {errors.participants[index] && (
                          <p className="text-web3-orange text-sm mt-1">
                            {errors.participants[index]}
                          </p>
                        )}
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeParticipant(index)}
                          disabled={isSubmitting}
                          className="text-web3-orange"
                        >
                          <span className="sr-only">Remove</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Track Selection */}
              <div className="space-y-2">
                <Label htmlFor="track" className="text-white flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-web3-blue" />
                  Select Track
                </Label>
                <Select
                  value={selectedTrack}
                  onValueChange={setSelectedTrack}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={`bg-web3-card border ${
                      errors.track ? "border-web3-orange" : "border-white/10"
                    } text-white`}
                  >
                    <SelectValue placeholder="Select a track" />
                  </SelectTrigger>
                  <SelectContent className="bg-web3-card border border-white/10 text-white">
                    {TRACKS.map((track) => (
                      <SelectItem
                        key={track.id}
                        value={track.id}
                        className="focus:bg-white/10 focus:text-white"
                      >
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.track && (
                  <p className="text-web3-orange text-sm mt-1">{errors.track}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  variant="outline"
                  onClick={toggleForm}
                  disabled={isSubmitting}
                  className="border-white/20 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !!networkError}
                  className="relative group overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_25px_rgba(248,161,0,0.3)]"
                  style={{
                    background: "linear-gradient(135deg, #4A90E2 0%, #F8A100 100%)",
                  }}
                >
                  <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {isSubmitting ? "Creating..." : "Create Challenge"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default CreateChallenge;
