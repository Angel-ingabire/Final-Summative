import { expect } from "chai";
import { network } from "hardhat";
import { expectRevert } from "./helpers.js";

const { ethers } = await network.getOrCreate();

describe("MockRWF", function () {
  it("mints the six-decimal test token only through an authorized minter", async function () {
    const [admin, user, unauthorized] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockRWF");
    const token = await Token.deploy();
    await token.waitForDeployment();

    await token.mint(user.address, ethers.parseUnits("25", 6));
    expect(await token.balanceOf(user.address)).to.equal(25_000_000n);
    await expectRevert(
      token.connect(unauthorized).mint(user.address, 1n),
      token,
      "AccessControlUnauthorizedAccount"
    );
    expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
  });
});
