
export const CONTRACT_ADDRESS =
  "0x670c01EcAdddE806b9B16c67Ddf278938de3aD34";

export const CONTRACT_ABI = [
  "function bountyCount() view returns (uint256)",

  "function bounties(uint256) view returns (address creator, uint256 reward, uint256 deadline, uint256 submissionCount, uint256 winnerId, bool completed, bool cancelled)",

  "function getBounty(uint256 _bountyId) view returns (tuple(address creator, string title, string description, uint256 reward, uint256 deadline, uint256 submissionCount, uint256 winnerId, bool completed, bool cancelled))",

  "function createBounty(string _title, string _description, uint256 _deadline) payable",

  "function submitWork(uint256 _bountyId, string calldata _workCID)",

  "function getSubmission(uint256 _bountyId, uint256 _submissionId) view returns (address submitter, string memory workCID)",

  "function selectWinner(uint256 _bountyId, uint256 _submissionId)",

  "function claimReward()",

  "function pendingWithdrawals(address) view returns (uint256)",

  "function cancelBounty(uint256 _bountyId)",

  "function claimRefund(uint256 _bountyId)",

  "function refundAbandonedBounty(uint256 _bountyId)",
];
