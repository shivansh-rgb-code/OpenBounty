
import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const bounty = await ethers.deployContract("OpenBounty");

    await bounty.waitForDeployment();

    const address = await bounty.getAddress();

    console.log("OpenBounty deployed successfully!");
    console.log("Contract address:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
