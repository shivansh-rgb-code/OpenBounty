
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract OpenBounty {
    struct Bounty {
        address creator;
        string title;
        string description;
        uint256 reward;
        uint256 deadline;
        uint256 submissionCount;
        uint256 winnerId;
        bool completed;
        bool cancelled;
    }

    struct Submission {
        address submitter;
        string workCID;
    }

    uint256 public bountyCount;
    uint256 public constant SELECTION_PERIOD = 7 days;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => mapping(uint256 => Submission)) public submissions;
    mapping(address => mapping(uint256 => bool)) public hasSubmitted;
    mapping(address => uint256) public pendingWithdrawals;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        string title,
        string description,
        uint256 reward,
        uint256 deadline
    );

    event WorkSubmitted(
        uint256 indexed bountyId,
        uint256 indexed submissionId,
        address indexed submitter
    );

    event WinnerSelected(
        uint256 indexed bountyId,
        uint256 indexed submissionId,
        address winner
    );

    event RewardClaimed(address indexed recipient, uint256 amount);
    event BountyCancelled(uint256 indexed bountyId);
    event RefundClaimed(address indexed creator, uint256 amount);

    function createBounty(
        string calldata _title,
        string calldata _description,
        uint256 _deadline
    ) external payable {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(msg.value > 0, "Reward must be greater than zero");
        require(_deadline > block.timestamp, "Deadline must be in future");

        bountyCount++;

        bounties[bountyCount] = Bounty({
            creator: msg.sender,
            title: _title,
            description: _description,
            reward: msg.value,
            deadline: _deadline,
            submissionCount: 0,
            winnerId: 0,
            completed: false,
            cancelled: false
        });

        emit BountyCreated(
            bountyCount,
            msg.sender,
            _title,
            _description,
            msg.value,
            _deadline
        );
    }

    // Returns all bounty fields, including dynamic strings.
    function getBounty(uint256 _bountyId)
        external
        view
        returns (Bounty memory)
    {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        return bounties[_bountyId];
    }

    function submitWork(
        uint256 _bountyId,
        string calldata _workCID
    ) external {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        Bounty storage bounty = bounties[_bountyId];

        require(!bounty.completed && !bounty.cancelled, "Bounty not active");
        require(block.timestamp < bounty.deadline, "Deadline passed");
        require(bytes(_workCID).length > 0, "Work CID cannot be empty");
        require(!hasSubmitted[msg.sender][_bountyId], "Already submitted");

        bounty.submissionCount++;

        submissions[_bountyId][bounty.submissionCount] = Submission({
            submitter: msg.sender,
            workCID: _workCID
        });

        hasSubmitted[msg.sender][_bountyId] = true;

        emit WorkSubmitted(
            _bountyId,
            bounty.submissionCount,
            msg.sender
        );
    }

    function selectWinner(
        uint256 _bountyId,
        uint256 _submissionId
    ) external {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        Bounty storage bounty = bounties[_bountyId];

        require(msg.sender == bounty.creator, "Only creator");
        require(!bounty.completed && !bounty.cancelled, "Bounty not active");
        require(block.timestamp >= bounty.deadline, "Deadline not reached");
        require(
            block.timestamp < bounty.deadline + SELECTION_PERIOD,
            "Selection period expired"
        );
        require(
            _submissionId > 0 && _submissionId <= bounty.submissionCount,
            "Invalid submission"
        );

        address winner = submissions[_bountyId][_submissionId].submitter;

        bounty.winnerId = _submissionId;
        bounty.completed = true;

        pendingWithdrawals[winner] += bounty.reward;

        emit WinnerSelected(_bountyId, _submissionId, winner);
    }

    function claimReward() external {
        uint256 amount = pendingWithdrawals[msg.sender];

        require(amount > 0, "No reward available");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");

        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    function cancelBounty(uint256 _bountyId) external {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        Bounty storage bounty = bounties[_bountyId];

        require(msg.sender == bounty.creator, "Only creator");
        require(!bounty.completed && !bounty.cancelled, "Bounty not active");
        require(bounty.submissionCount == 0, "Work already submitted");

        bounty.cancelled = true;

        pendingWithdrawals[bounty.creator] += bounty.reward;

        emit BountyCancelled(_bountyId);
    }

    function claimRefund(uint256 _bountyId) external {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        Bounty storage bounty = bounties[_bountyId];

        require(msg.sender == bounty.creator, "Only creator");
        require(!bounty.completed && !bounty.cancelled, "Bounty not active");
        require(block.timestamp >= bounty.deadline, "Deadline not reached");
        require(bounty.submissionCount == 0, "Work already submitted");

        bounty.cancelled = true;

        pendingWithdrawals[bounty.creator] += bounty.reward;

        emit RefundClaimed(msg.sender, bounty.reward);
    }

    function refundAbandonedBounty(uint256 _bountyId) external {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        Bounty storage bounty = bounties[_bountyId];

        require(!bounty.completed && !bounty.cancelled, "Bounty not active");
        require(bounty.submissionCount > 0, "No submissions");
        require(
            block.timestamp >= bounty.deadline + SELECTION_PERIOD,
            "Selection period not expired"
        );

        bounty.cancelled = true;

        pendingWithdrawals[bounty.creator] += bounty.reward;

        emit RefundClaimed(bounty.creator, bounty.reward);
    }

    function getSubmission(
        uint256 _bountyId,
        uint256 _submissionId
    ) external view returns (address submitter, string memory workCID) {
        require(
            _bountyId > 0 && _bountyId <= bountyCount,
            "Bounty does not exist"
        );

        require(
            _submissionId > 0 &&
            _submissionId <= bounties[_bountyId].submissionCount,
            "Invalid submission"
        );

        Submission storage submission = submissions[_bountyId][_submissionId];

        return (submission.submitter, submission.workCID);
    }
}
