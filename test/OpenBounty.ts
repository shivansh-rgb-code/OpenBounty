
import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("OpenBounty", function () {
    let bounty: any;
    let creator: any;
    let submitter: any;
    let other: any;

    const reward = ethers.parseEther("1");
    const SELECTION_PERIOD = 7 * 24 * 60 * 60;

    async function createBounty() {
        const block = await ethers.provider.getBlock("latest");
        const deadline = BigInt(block!.timestamp + 3600);

        await bounty.connect(creator).createBounty(deadline, {
            value: reward
        });

        return deadline;
    }

    async function advanceTime(seconds: number) {
        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine", []);
    }

    async function expectRevert(
        action: () => Promise<any>,
        message: string
    ) {
        try {
            await action();
            expect.fail("Expected transaction to revert");
        } catch (error: any) {
            expect(String(error)).to.include(message);
        }
    }

    beforeEach(async function () {
        [creator, submitter, other] = await ethers.getSigners();

        bounty = await ethers.deployContract("OpenBounty");
        await bounty.waitForDeployment();
    });

    describe("Creation", function () {
        it("Should create a funded bounty", async function () {
            await createBounty();

            const stored = await bounty.bounties(1);

            expect(stored.creator).to.equal(creator.address);
            expect(stored.reward).to.equal(reward);
            expect(await bounty.bountyCount()).to.equal(1);
        });

        it("Should reject zero ETH rewards", async function () {
            const block = await ethers.provider.getBlock("latest");
            const deadline = BigInt(block!.timestamp + 3600);

            await expectRevert(
                () => bounty.createBounty(deadline, { value: 0 }),
                "Reward must be greater than zero"
            );
        });

        it("Should reject past deadlines", async function () {
            await expectRevert(
                () => bounty.createBounty(1, { value: reward }),
                "Deadline must be in future"
            );
        });
    });

    describe("Submissions", function () {
        it("Should accept a valid submission", async function () {
            await createBounty();

            await bounty.connect(submitter).submitWork(1, "QmExampleCID123");

            const submission = await bounty.getSubmission(1, 1);

            expect(submission.submitter).to.equal(submitter.address);
            expect(submission.workCID).to.equal("QmExampleCID123");
        });

        it("Should reject duplicate submissions", async function () {
            await createBounty();

            await bounty.connect(submitter).submitWork(1, "CID1");

            await expectRevert(
                () => bounty.connect(submitter).submitWork(1, "CID2"),
                "Already submitted"
            );
        });

        it("Should reject empty CIDs", async function () {
            await createBounty();

            await expectRevert(
                () => bounty.connect(submitter).submitWork(1, ""),
                "Work CID cannot be empty"
            );
        });

        it("Should reject submissions after deadline", async function () {
            await createBounty();
            await advanceTime(3601);

            await expectRevert(
                () => bounty.connect(submitter).submitWork(1, "CID"),
                "Deadline passed"
            );
        });
    });

    describe("Winner selection", function () {
        it("Should allow creator to select a winner after deadline", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);
            await bounty.connect(creator).selectWinner(1, 1);

            const stored = await bounty.bounties(1);

            expect(stored.completed).to.equal(true);
            expect(stored.winnerId).to.equal(1);

            expect(
                await bounty.pendingWithdrawals(submitter.address)
            ).to.equal(reward);
        });

        it("Should reject winner selection by outsiders", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);

            await expectRevert(
                () => bounty.connect(other).selectWinner(1, 1),
                "Only creator"
            );
        });

        it("Should reject selection before deadline", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await expectRevert(
                () => bounty.connect(creator).selectWinner(1, 1),
                "Deadline not reached"
            );
        });

        it("Should reject winner selection after the selection period", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601 + SELECTION_PERIOD);

            await expectRevert(
                () => bounty.connect(creator).selectWinner(1, 1),
                "Selection period expired"
            );
        });
    });

    describe("Withdrawals", function () {
        it("Should allow winner to withdraw reward", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);

            await bounty.connect(creator).selectWinner(1, 1);
            await bounty.connect(submitter).claimReward();

            expect(
                await bounty.pendingWithdrawals(submitter.address)
            ).to.equal(0);
        });

        it("Should prevent double withdrawal", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);

            await bounty.connect(creator).selectWinner(1, 1);
            await bounty.connect(submitter).claimReward();

            await expectRevert(
                () => bounty.connect(submitter).claimReward(),
                "No reward available"
            );
        });
    });

    describe("Cancellation and refunds", function () {
        it("Should allow cancellation without submissions", async function () {
            await createBounty();
            await bounty.connect(creator).cancelBounty(1);

            const stored = await bounty.bounties(1);

            expect(stored.cancelled).to.equal(true);
            expect(
                await bounty.pendingWithdrawals(creator.address)
            ).to.equal(reward);
        });

        it("Should reject cancellation after submissions", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await expectRevert(
                () => bounty.connect(creator).cancelBounty(1),
                "Work already submitted"
            );
        });

        it("Should allow refund after deadline without submissions", async function () {
            await createBounty();
            await advanceTime(3601);

            await bounty.connect(creator).claimRefund(1);

            expect(
                await bounty.pendingWithdrawals(creator.address)
            ).to.equal(reward);
        });

        it("Should reject refund if submissions exist", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);

            await expectRevert(
                () => bounty.connect(creator).claimRefund(1),
                "Work already submitted"
            );
        });

        it("Should allow anyone to refund an abandoned bounty", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601 + SELECTION_PERIOD);

            await bounty.connect(other).refundAbandonedBounty(1);

            const stored = await bounty.bounties(1);

            expect(stored.cancelled).to.equal(true);
            expect(
                await bounty.pendingWithdrawals(creator.address)
            ).to.equal(reward);
        });

        it("Should reject abandoned bounty refund before selection period expires", async function () {
            await createBounty();
            await bounty.connect(submitter).submitWork(1, "CID");

            await advanceTime(3601);

            await expectRevert(
                () => bounty.connect(other).refundAbandonedBounty(1),
                "Selection period not expired"
            );
        });
    });
});
