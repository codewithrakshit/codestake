import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/animations/AnimatedBackground";
import { ChevronDown, Code, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Define the Ethereum object globally
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>;
    };
  }
}

const Hero = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Load wallet address from localStorage (if previously connected)
  useEffect(() => {
    const storedWallet = localStorage.getItem("walletAddress");
    if (storedWallet) {
      setWalletAddress(storedWallet);
    }
  }, []);

  // Function to handle wallet connection
  const handleCreateChallenge = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast.error("Please install MetaMask to continue!");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

      if (accounts.length > 0) {
        const connectedWallet = accounts[0]; // First account
        setWalletAddress(connectedWallet);
        localStorage.setItem("walletAddress", connectedWallet); // Store wallet in localStorage

        toast.success(`Wallet Connected: ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`);
        
        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        toast.warning("No wallet selected. Please try again.");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  // Function to scroll to a section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <AnimatedBackground />
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block glassmorphism px-3 py-1 rounded-full mb-6 animate-fade-in">
            <span className="text-sm text-white/90 flex items-center">
              <Code className="h-4 w-4 mr-2 text-web3-blue" />
              <span>Web3-powered DeFi Learning Platform</span>
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in text-gradient leading-tight">
            Stake. Code. Win.
            <span className="block text-web3-blue">The Future of Competitive Learning.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 animate-fade-in max-w-2xl mx-auto">
            Compete in coding challenges, stake crypto, and earn rewards by completing milestone-based quizzes. Secure, fair, and rewarding.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
            <Button 
              variant="default"
              size="lg"
              className="relative group overflow-hidden transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[0_0_25px_rgba(248,161,0,0.3)]"
              style={{
                background: "linear-gradient(135deg, #4A90E2 0%, #F8A100 100%)",
              }}
              onClick={handleCreateChallenge}
            >
              <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
              {walletAddress ? "Go to Dashboard" : "Connect Wallet"}
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => scrollToSection("challenges")}
            >
              Explore Challenges
            </Button>
          </div>
        </div>
        
        {/* Scroll down indicator */}
        <div className="hidden md:flex justify-center absolute bottom-10 left-0 right-0 animate-float">
          <button 
            onClick={() => scrollToSection("features")}
            className="text-white/70 hover:text-white transition-all"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-10 w-10" />
          </button>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-web3-background to-transparent z-[1]"></div>
    </section>
  );
};

export default Hero;
