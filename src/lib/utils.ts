
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ethers } from "ethers";

// Smart Contract Details - update ABI to use concrete types instead of complex structs
const CONTRACT_ADDRESS = "0x5b4050c163Fb24522Fa25876b8F6A983a69D9165";
const CONTRACT_ABI = [
  // Use concrete types instead of Challenge memory
  "function getChallengeDetails(uint256 challengeId) view returns (address creator, uint256 totalStake, uint256 totalPlayers, uint256 joinedCount, uint256 balance, uint256 milestoneCount)",
  "function createChallenge(uint256 totalStake, uint256 totalPlayers, address[] participants, uint256[] milestoneTimestamps) payable",
  "function joinChallenge(uint256 challengeId) payable",
  "function completeMilestone(uint256 challengeId, uint256 milestoneIndex)",
  "function getWalletSummary(address user) view returns (uint256 balance, uint256 totalEarned, uint256 totalStaked)",
  "function challengeCounter() view returns (uint256)",
  // Define concrete return types for challenges mapping
  "function challenges(uint256) view returns (address creator, uint256 totalStake, uint256 totalPlayers, uint256 joinedCount, uint256 balance, uint256 rewardPerMilestone)",
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function getActiveChallenges() view returns (uint256[])",
  "function setMilestoneWinner(uint256 challengeId, uint256 milestoneIndex, address winner)",
  "function withdrawRemainingBalance(uint256 challengeId)",
  "function hasJoined(uint256, address) view returns (bool)"
];

// Utility function to combine Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eduChain network configuration for MetaMask
export const EDU_CHAIN_CONFIG = {
  chainId: "0xa045c",
  chainName: "EDU Chain Testnet",
  nativeCurrency: {
    name: "EDU Token",
    symbol: "EDU",
    decimals: 18,
  },
  rpcUrls: ["wss://open-campus-codex-sepolia.drpc.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"], // Assuming Sepolia explorer, update if there's a specific one
};

// Utility function to format wallet address for display
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Add the missing shortenAddress function (same as formatAddress for compatibility)
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Utility function to format ETH value with specified decimal places
export function formatEth(value: string | number, decimals: number = 4): string {
  if (typeof value === "string") {
    value = parseFloat(value);
  }
  return value.toFixed(decimals);
}

export { CONTRACT_ADDRESS, CONTRACT_ABI };
