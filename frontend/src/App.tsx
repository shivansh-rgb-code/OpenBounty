
import { useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatEther,
  parseEther,
} from "ethers";

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contract";
import "./App.css";

interface Bounty {
  id: number;
  creator: string;
  reward: string;
  deadline: string;
  deadlineTimestamp: number;
  submissionCount: number;
  winnerId: number;
  completed: boolean;
  cancelled: boolean;
}

interface Submission {
  id: number;
  submitter: string;
  workCID: string;
}

function App() {
  const [account, setAccount] = useState("");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [pendingReward, setPendingReward] = useState("0");

  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");

  const [selectedBounty, setSelectedBounty] = useState("");
  const [workCID, setWorkCID] = useState("");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [fundsActionLoading, setFundsActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function getProvider() {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask.");
    }

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== 11155111n) {
      throw new Error("Please switch MetaMask to Sepolia.");
    }

    return provider;
  }

  async function connectWallet() {
    try {
      setError("");
      setMessage("");

      const provider = await getProvider();
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);

      await loadBounties(provider);
      await loadPendingReward(provider, address);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wallet connection failed."
      );
    }
  }

  async function loadBounties(provider: BrowserProvider) {
    try {
      setLoading(true);

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const count = await contract.bountyCount();
      const total = Number(count);

      const loadedBounties: Bounty[] = [];

      for (let i = 1; i <= total; i++) {
        const bounty = await contract.bounties(i);

        loadedBounties.push({
          id: i,
          creator: bounty.creator,
          reward: formatEther(bounty.reward),
          deadline: new Date(
            Number(bounty.deadline) * 1000
          ).toLocaleString(),
          deadlineTimestamp: Number(bounty.deadline),
          submissionCount: Number(bounty.submissionCount),
          winnerId: Number(bounty.winnerId),
          completed: bounty.completed,
          cancelled: bounty.cancelled,
        });
      }

      setBounties(loadedBounties);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load bounties."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingReward(
    provider: BrowserProvider,
    address: string
  ) {
    const contract = new Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const amount = await contract.pendingWithdrawals(address);
    setPendingReward(formatEther(amount));
  }

  async function refreshData(provider: BrowserProvider) {
    await loadBounties(provider);

    if (account) {
      await loadPendingReward(provider, account);
    }
  }

  async function createBounty() {
    try {
      setError("");
      setMessage("");

      if (!reward || Number(reward) <= 0) {
        throw new Error("Enter a valid reward amount.");
      }

      if (!deadline) {
        throw new Error("Please select a deadline.");
      }

      const deadlineTimestamp = Math.floor(
        new Date(deadline).getTime() / 1000
      );

      if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
        throw new Error("Deadline must be in the future.");
      }

      setCreating(true);

      const provider = await getProvider();
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const transaction = await contract.createBounty(
        deadlineTimestamp,
        { value: parseEther(reward) }
      );

      setMessage("Waiting for transaction confirmation...");
      await transaction.wait();

      setMessage("Bounty created successfully!");

      setReward("");
      setDeadline("");

      await refreshData(provider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create bounty."
      );
    } finally {
      setCreating(false);
    }
  }

  async function submitWork() {
    try {
      setError("");
      setMessage("");

      if (!selectedBounty) {
        throw new Error("Please select a bounty.");
      }

      if (!workCID.trim()) {
        throw new Error("Please enter your IPFS CID.");
      }

      setSubmitting(true);

      const provider = await getProvider();
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const transaction = await contract.submitWork(
        Number(selectedBounty),
        workCID.trim()
      );

      setMessage("Waiting for submission confirmation...");
      await transaction.wait();

      setMessage("Work submitted successfully!");

      setWorkCID("");
      await refreshData(provider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit work."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function loadSubmissions() {
    try {
      setError("");
      setMessage("");

      if (!selectedBounty) {
        throw new Error("Please select a bounty.");
      }

      setSubmissionsLoading(true);
      setSubmissions([]);

      const provider = await getProvider();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const bounty = await contract.bounties(
        Number(selectedBounty)
      );

      const loadedSubmissions: Submission[] = [];

      for (let i = 1; i <= Number(bounty.submissionCount); i++) {
        const submission = await contract.getSubmission(
          Number(selectedBounty),
          i
        );

        loadedSubmissions.push({
          id: i,
          submitter: submission.submitter,
          workCID: submission.workCID,
        });
      }

      setSubmissions(loadedSubmissions);

      if (loadedSubmissions.length === 0) {
        setMessage("This bounty has no submissions yet.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load submissions."
      );
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function selectWinner(submissionId: number) {
    try {
      setError("");
      setMessage("");
      setSelecting(true);

      const provider = await getProvider();
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const transaction = await contract.selectWinner(
        Number(selectedBounty),
        submissionId
      );

      setMessage("Waiting for winner selection confirmation...");
      await transaction.wait();

      setMessage(`Submission #${submissionId} selected as winner!`);

      await refreshData(provider);
      await loadSubmissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not select winner."
      );
    } finally {
      setSelecting(false);
    }
  }

  async function claimReward() {
    try {
      setError("");
      setMessage("");

      if (Number(pendingReward) <= 0) {
        throw new Error("You have no pending rewards.");
      }

      setFundsActionLoading(true);

      const provider = await getProvider();
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const transaction = await contract.claimReward();

      setMessage("Waiting for reward withdrawal confirmation...");
      await transaction.wait();

      setMessage("Reward withdrawn successfully!");

      await refreshData(provider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not withdraw reward."
      );
    } finally {
      setFundsActionLoading(false);
    }
  }

  async function bountyFundsAction(
    action: "cancelBounty" | "claimRefund" | "refundAbandonedBounty",
    bountyId: number
  ) {
    try {
      setError("");
      setMessage("");
      setFundsActionLoading(true);

      const provider = await getProvider();
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const transaction = await contract[action](bountyId);

      setMessage("Waiting for transaction confirmation...");
      await transaction.wait();

      const messages = {
        cancelBounty: "Bounty cancelled successfully!",
        claimRefund: "Bounty refund credited successfully!",
        refundAbandonedBounty:
          "Abandoned bounty refund credited to its creator!",
      };

      setMessage(messages[action]);

      await refreshData(provider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Transaction failed."
      );
    } finally {
      setFundsActionLoading(false);
    }
  }

  const selected = bounties.find(
    (bounty) => bounty.id === Number(selectedBounty)
  );

  const now = Math.floor(Date.now() / 1000);
  const selectionPeriod = 7 * 24 * 60 * 60;

  const activeBounties = bounties.filter(
    (bounty) =>
      !bounty.completed &&
      !bounty.cancelled &&
      bounty.deadlineTimestamp > now
  );

  const bountiesWithSubmissions = bounties.filter(
    (bounty) => bounty.submissionCount > 0
  );

  const isCreator = (bounty: Bounty) =>
    account.toLowerCase() === bounty.creator.toLowerCase();

  return (
    <div className="app">
      <header className="navbar">
        <h1>OpenBounty</h1>

        {account ? (
          <span className="wallet-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        ) : (
          <button onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </header>

      <main className="main-content">
        <h2>Decentralized Bounty Platform</h2>

        <p>
          Create bounties, submit your work, and earn rewards
          directly on Ethereum.
        </p>

        {!account ? (
          <div className="empty-state">
            <h3>Connect your wallet</h3>
            <p>Connect MetaMask to explore OpenBounty.</p>
          </div>
        ) : (
          <>
            <section className="funds-section">
              <h2>Your Pending Rewards</h2>
              <p className="pending-amount">{pendingReward} ETH</p>
              <button
                onClick={claimReward}
                disabled={
                  fundsActionLoading || Number(pendingReward) <= 0
                }
              >
                {fundsActionLoading ? "Processing..." : "Withdraw Rewards"}
              </button>
            </section>

            <section className="create-section">
              <h2>Create a Bounty</h2>

              <div className="create-form">
                <label htmlFor="reward">Reward (ETH)</label>
                <input
                  id="reward"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 0.05"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                />

                <label htmlFor="deadline">Submission Deadline</label>
                <input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />

                <button onClick={createBounty} disabled={creating}>
                  {creating ? "Creating..." : "Create Bounty"}
                </button>
              </div>
            </section>

            <section className="submit-section">
              <h2>Submit Your Work</h2>

              <div className="create-form">
                <label htmlFor="bounty-select">Select Bounty</label>
                <select
                  id="bounty-select"
                  value={selectedBounty}
                  onChange={(e) => {
                    setSelectedBounty(e.target.value);
                    setSubmissions([]);
                  }}
                >
                  <option value="">Choose a bounty</option>
                  {activeBounties.map((bounty) => (
                    <option key={bounty.id} value={bounty.id}>
                      Bounty #{bounty.id} — {bounty.reward} ETH
                    </option>
                  ))}
                </select>

                {selected && (
                  <p className="selected-info">
                    Deadline: {selected.deadline}
                    <br />
                    Submissions: {selected.submissionCount}
                  </p>
                )}

                <label htmlFor="work-cid">IPFS CID</label>
                <input
                  id="work-cid"
                  type="text"
                  placeholder="Enter your IPFS CID"
                  value={workCID}
                  onChange={(e) => setWorkCID(e.target.value)}
                />

                <button
                  onClick={submitWork}
                  disabled={submitting || activeBounties.length === 0}
                >
                  {submitting ? "Submitting..." : "Submit Work"}
                </button>
              </div>

              {activeBounties.length === 0 && (
                <p>No active bounties available for submission.</p>
              )}
            </section>

            <section className="submissions-section">
              <h2>Review Submissions</h2>

              <div className="create-form">
                <label htmlFor="review-bounty">
                  Select Bounty to Review
                </label>

                <select
                  id="review-bounty"
                  value={selectedBounty}
                  onChange={(e) => {
                    setSelectedBounty(e.target.value);
                    setSubmissions([]);
                  }}
                >
                  <option value="">Choose a bounty</option>
                  {bountiesWithSubmissions.map((bounty) => (
                    <option key={bounty.id} value={bounty.id}>
                      Bounty #{bounty.id} — {bounty.submissionCount} submissions
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadSubmissions}
                  disabled={!selectedBounty || submissionsLoading}
                >
                  {submissionsLoading ? "Loading..." : "Load Submissions"}
                </button>
              </div>

              {selected && (
                <p className="selected-info">
                  Creator: {selected.creator}
                  <br />
                  Deadline: {selected.deadline}
                  <br />
                  Status: {selected.completed
                    ? `Completed (winner: #${selected.winnerId})`
                    : selected.cancelled
                      ? "Cancelled"
                      : "Not completed"}
                </p>
              )}

              <div className="submission-list">
                {submissions.map((submission) => (
                  <div className="submission-card" key={submission.id}>
                    <h3>Submission #{submission.id}</h3>

                    <p>
                      <strong>Submitter:</strong>
                      <br />
                      {submission.submitter}
                    </p>

                    <p>
                      <strong>IPFS CID:</strong>
                      <br />
                      {submission.workCID}
                    </p>

                    <a
                      href={`https://ipfs.io/ipfs/${encodeURIComponent(submission.workCID)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Submitted Work
                    </a>

                    {selected &&
                      isCreator(selected) &&
                      !selected.completed &&
                      !selected.cancelled &&
                      selected.deadlineTimestamp <= now &&
                      now < selected.deadlineTimestamp + selectionPeriod && (
                        <button
                          onClick={() => selectWinner(submission.id)}
                          disabled={selecting}
                        >
                          {selecting ? "Processing..." : "Select as Winner"}
                        </button>
                      )}

                    {selected?.completed &&
                      selected.winnerId === submission.id && (
                        <p className="winner-label">Selected Winner</p>
                      )}
                  </div>
                ))}
              </div>

              {selected &&
                selected.deadlineTimestamp > now && (
                  <p className="selected-info">
                    Winner selection becomes available after the deadline.
                  </p>
                )}

              {selected &&
                !isCreator(selected) &&
                !selected.completed && (
                  <p className="selected-info">
                    Only the bounty creator can select a winner.
                  </p>
                )}
            </section>

            <section className="bounty-section">
              <h2>All Bounties</h2>

              {loading && <p>Loading bounties...</p>}

              {!loading && bounties.length === 0 && (
                <p>No bounties have been created yet.</p>
              )}

              <div className="bounty-list">
                {bounties.map((bounty) => {
                  const creator = isCreator(bounty);
                  const deadlinePassed = bounty.deadlineTimestamp <= now;
                  const selectionExpired =
                    now >= bounty.deadlineTimestamp + selectionPeriod;

                  const canCancel =
                    creator &&
                    !bounty.completed &&
                    !bounty.cancelled &&
                    bounty.submissionCount === 0;

                  const canClaimRefund =
                    creator &&
                    !bounty.completed &&
                    !bounty.cancelled &&
                    bounty.submissionCount === 0 &&
                    deadlinePassed;

                  const canRefundAbandoned =
                    !bounty.completed &&
                    !bounty.cancelled &&
                    bounty.submissionCount > 0 &&
                    selectionExpired;

                  return (
                    <div className="bounty-card" key={bounty.id}>
                      <h3>Bounty #{bounty.id}</h3>

                      <p>
                        <strong>Reward:</strong> {bounty.reward} ETH
                      </p>

                      <p>
                        <strong>Creator:</strong>{" "}
                        {bounty.creator.slice(0, 8)}...
                      </p>

                      <p>
                        <strong>Deadline:</strong> {bounty.deadline}
                      </p>

                      <p>
                        <strong>Submissions:</strong>{" "}
                        {bounty.submissionCount}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        {bounty.completed
                          ? "Completed"
                          : bounty.cancelled
                            ? "Cancelled"
                            : deadlinePassed
                              ? "Deadline Passed"
                              : "Active"}
                      </p>

                      {canCancel && (
                        <button
                          className="secondary-button"
                          onClick={() =>
                            bountyFundsAction("cancelBounty", bounty.id)
                          }
                          disabled={fundsActionLoading}
                        >
                          Cancel Bounty
                        </button>
                      )}

                      {canClaimRefund && (
                        <button
                          onClick={() =>
                            bountyFundsAction("claimRefund", bounty.id)
                          }
                          disabled={fundsActionLoading}
                        >
                          Claim Unused Reward
                        </button>
                      )}

                      {canRefundAbandoned && (
                        <button
                          onClick={() =>
                            bountyFundsAction(
                              "refundAbandonedBounty",
                              bounty.id
                            )
                          }
                          disabled={fundsActionLoading}
                        >
                          Refund Abandoned Bounty
                        </button>
                      )}

                      {bounty.completed && (
                        <p className="winner-label">
                          Winner: Submission #{bounty.winnerId}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
      </main>
    </div>
  );
}

export default App;
