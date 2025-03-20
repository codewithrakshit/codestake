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
import { PlusCircle, Sparkles, Users, BookOpen, Calendar, AlertCircle } from "lucide-react";
import { useWeb3 } from "@/context/Web3Provider";
import { toast } from "sonner";
import { 
  EDU_CHAIN_CONFIG, 
  getCurrentChainId, 
  handleContractError, 
  switchToEduChain,
  safeContractCall
} from "@/lib/utils";

const TRACKS = [
  { id: "javascript", name: "JavaScript" },
  { id: "solidity", name: "Solidity" },
  { id: "python", name: "Python" },
  { id: "rust", name: "Rust" },
  { id: "react", name: "React" },
];

const validateContractState = (contract) => {
  if (!contract) {
    return { valid: false, error: "Contract not initialized. Please reconnect your wallet." };
  }
  
  if (!contract.createChallenge) {
    return { 
      valid: false, 
      error: "Contract method 'createChallenge' not found. Make sure you're connected to eduChain Testnet." 
    };
  }
  
  return { valid: true };
};

const CreateChallenge = () => {
  const { contract, wallet, isConnected } = useWeb3();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [participants, setParticipants] = useState<string[]>([""]);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [errors, setErrors] = useState({
    stakeAmount: "",
    participants: [""],
    track: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [contractValid, setContractValid] = useState(true);

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
    
    if (contract) {
      const validation = validateContractState(contract);
      setContractValid(validation.valid);
      if (!validation.valid) {
        setDebugInfo(validation.error);
      }
    }
  }, [isConnected, wallet, contract]);

  const toggleForm = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      resetForm();
    }
  };

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
    setDebugInfo(null);
  };

  const addParticipant = () => {
    if (participants.length < 4) {
      setParticipants([...participants, ""]);
      setErrors({
        ...errors,
        participants: [...errors.participants, ""],
      });
    }
  };

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

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      stakeAmount: "",
      participants: participants.map(() => ""),
      track: "",
    };

    if (!stakeAmount) {
      newErrors.stakeAmount = "Stake amount is required";
      valid = false;
    } else if (isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      newErrors.stakeAmount = "Please enter a valid amount";
      valid = false;
    }

    participants.forEach((participant, index) => {
      if (!participant) {
        newErrors.participants[index] = "Wallet address is required";
        valid = false;
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(participant)) {
        newErrors.participants[index] = "Invalid Ethereum address";
        valid = false;
      }
    });

    if (!selectedTrack) {
      newErrors.track = "Please select a track";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    const chainId = await getCurrentChainId();
    if (chainId && chainId !== EDU_CHAIN_CONFIG.chainId) {
      toast.error(`Please connect to eduChain Testnet (Chain ID: ${EDU_CHAIN_CONFIG.chainId})`);
      const switched = await handleSwitchNetwork();
      if (!switched) return;
    }

    const contractStatus = validateContractState(contract);
    if (!contractStatus.valid) {
      toast.error(contractStatus.error);
      setDebugInfo(contractStatus.error);
      return;
    }

    setIsSubmitting(true);
    setDebugInfo(null);

    try {
      if (!window.ethereum) {
        throw new Error("No wallet found. Please install MetaMask.");
      }

      let stakeInWei;
      try {
        stakeInWei = ethers.parseEther(stakeAmount);
        if (stakeInWei > ethers.parseEther("0.01")) {
          setDebugInfo("Warning: High stake amounts may cause transaction failures. Consider using a smaller amount (0.001-0.01 EDU) for testing.");
        }
      } catch (parseError) {
        console.error("Error parsing stake amount:", parseError);
        toast.error("Invalid stake amount. Please check your input.");
        setIsSubmitting(false);
        return;
      }

      const validParticipants = [...new Set(participants.filter(p => p))];
      
      const totalPlayers = validParticipants.length;
      
      const now = Math.floor(Date.now() / 1000);
      const milestoneTimestamps = [
        now + 86400,
        now + 172800,
        now + 259200,
      ];

      toast.loading("Creating challenge...");

      console.log("Calling contract with params:", {
        stakeInWei: stakeInWei.toString(),
        totalPlayers,
        validParticipants,
        milestoneTimestamps,
        track: selectedTrack,
      });
      
      console.log("Contract methods available:", Object.keys(contract || {}));
      
      if (!contract) {
        throw new Error("Contract is not initialized");
      }
      
      if (!contract.createChallenge) {
        throw new Error("Contract method 'createChallenge' is not available. Please make sure you're connected to eduChain Testnet.");
      }
      
      try {
        const tx = await contract.createChallenge(
          stakeInWei, 
          totalPlayers,
          validParticipants, 
          milestoneTimestamps,
          { 
            value: stakeInWei
          }
        );
        
        const receipt = await tx.wait();
        toast.success("Challenge created successfully!");
        console.log("Challenge created successfully. Tx hash:", receipt.hash);

        resetForm();
        setIsExpanded(false);
      } catch (callError) {
        const errorMessage = handleContractError(callError);
        toast.error(errorMessage);
        setDebugInfo(`Direct contract call error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      const errorMessage = handleContractError(error);
      toast.error(errorMessage);
      setDebugInfo(errorMessage);
    } finally {
      setIsSubmitting(false);
      toast.dismiss();
    }
  };

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

  const DebugInfo = () => {
    if (!debugInfo) return null;
    
    return (
      <div className="bg-black/70 border border-yellow-500 p-3 rounded-md mb-4 text-yellow-200 font-mono text-xs overflow-auto max-h-[150px]">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-4 w-4 mr-2 text-yellow-400" />
          <h4 className="font-bold">Debug Information</h4>
        </div>
        <p className="whitespace-pre-wrap">{debugInfo}</p>
        <p className="mt-2 text-yellow-400">
          Suggestion: Try reducing the stake amount to 0.001-0.01 EDU. The contract may have limitations on transaction size.
        </p>
      </div>
    );
  };

  const TransactionGuidance = () => {
    return (
      <div className="bg-blue-500/20 border border-blue-400 p-3 rounded-md mb-4">
        <h4 className="font-semibold text-blue-200 flex items-center">
          <Sparkles className="h-4 w-4 mr-2" />
          Tips for Successful Transactions
        </h4>
        <ul className="text-xs text-blue-100 mt-2 space-y-1 list-disc pl-4">
          <li>Start with small stake amounts (e.g. 0.001-0.01 EDU) for testing</li>
          <li>Ensure you have enough EDU tokens for gas fees plus your stake</li>
          <li>Verify you're connected to eduChain Testnet (Chain ID: 0xa045c)</li>
          <li>Complex transactions may sometimes fail due to gas limitations</li>
        </ul>
      </div>
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

            {!contractValid && (
              <div className="bg-red-500/20 border border-red-500 p-3 rounded-md mb-4 text-red-200">
                <p className="text-sm font-medium">Contract initialization error</p>
                <p className="text-xs mt-1">The contract appears to be missing required methods. Please ensure you're connected to eduChain Testnet.</p>
                <SwitchNetworkButton />
              </div>
            )}

            {debugInfo && <DebugInfo />}
            
            <TransactionGuidance />

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="stake-amount" className="text-white">
                  Stake Amount (EDU)
                </Label>
                <div className="relative">
                  <Input
                    id="stake-amount"
                    type="text"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.001"
                    disabled={isSubmitting}
                    className={`bg-web3-card border ${
                      errors.stakeAmount ? "border-web3-orange" : "border-white/10"
                    } text-white placeholder:text-white/50`}
                  />
                  {errors.stakeAmount && (
                    <p className="text-web3-orange text-sm mt-1">{errors.stakeAmount}</p>
                  )}
                  <p className="text-xs text-blue-300 mt-1">
                    Recommended: Use small amounts (0.001-0.01 EDU) for testing
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white flex items-center">
                    <Users className="h-4 w-4 mr-2 text-web3-blue" />
                    Challenge Participants
                  </Label>
                  {participants.length < 2 && (
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
                  disabled={isSubmitting || !!networkError || !contractValid}
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
