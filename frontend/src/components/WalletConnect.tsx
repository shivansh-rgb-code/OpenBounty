
import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";


function WalletConnect() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [error, setError] = useState("");

  async function connectWallet() {
    try {
      setError("");

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setAccount(address);
      setChainId(network.chainId.toString());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wallet connection failed."
      );
    }
  }

  function disconnectWallet() {
    setAccount("");
    setChainId("");
    setError("");
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts[0] || "");
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(BigInt(newChainId).toString());
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum?.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, []);

  const isSepolia = chainId === "11155111";

  return (
    <div className="wallet-container">
      {!account ? (
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <span className="wallet-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>

          <span className={isSepolia ? "network-good" : "network-warning"}>
            {isSepolia ? "Sepolia" : "Wrong Network"}
          </span>

          <button className="disconnect-button" onClick={disconnectWallet}>
            Disconnect
          </button>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default WalletConnect;
