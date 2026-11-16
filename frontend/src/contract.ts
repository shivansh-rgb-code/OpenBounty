
export const CONTRACT_ADDRESS =
  "0xeb24487bF189B9FDE17Ccac8f2084401E26C3206";

export const CONTRACT_ABI = [
  "function bountyCount() view returns (uint256)",

  "function bounties(uint256) view returns (address creator, uint256 reward, uint256 deadline, uint256 submissionCount, uint256 winnerId, bool completed, bool cancelled)",

  "function createBounty(uint256 _deadline) payable",

  "function submitWork(uint256 _bountyId, string calldata _workCID)",

  "function getSubmission(uint256 _bountyId, uint256 _submissionId) view returns (address submitter, string memory workCID)",

  "function selectWinner(uint256 _bountyId, uint256 _submissionId)",

  "function claimReward()",

  "function pendingWithdrawals(address) view returns (uint256)",

  "function cancelBounty(uint256 _bountyId)",

  "function claimRefund(uint256 _bountyId)",

  "function refundAbandonedBounty(uint256 _bountyId)",
];
