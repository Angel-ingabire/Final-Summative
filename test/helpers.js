import assert from "node:assert/strict";
import { expect } from "chai";

function revertData(error) {
  const candidates = [
    error?.data,
    error?.error?.data,
    error?.info?.error?.data,
    error?.info?.error?.data?.data,
    error?.cause?.data
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.startsWith("0x"));
}

export async function expectRevert(transaction, contract, expectedError) {
  let thrown;
  try {
    const result = await transaction;
    if (result && typeof result.wait === "function") await result.wait();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, "Expected the transaction to revert.");
  if (!expectedError) return;

  const data = revertData(thrown);
  const parsed = data ? contract.interface.parseError(data) : null;
  expect(parsed?.name, `Expected custom error ${expectedError}`).to.equal(expectedError);
}

export async function expectEvent(transaction, contract, eventName, expectedArgs = []) {
  const response = await transaction;
  const receipt = await response.wait();
  assert.ok(receipt, "Expected a mined transaction receipt.");

  let found;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) {
        found = parsed;
        break;
      }
    } catch {
      continue;
    }
  }
  expect(found, `Expected ${eventName} event`).to.exist;
  expectedArgs.forEach((expected, index) => {
    const actual = found.args[index];
    if (typeof expected === "string" && /^0x[0-9a-fA-F]{40}$/.test(expected)) {
      expect(actual.toLowerCase()).to.equal(expected.toLowerCase());
    } else {
      expect(actual).to.equal(expected);
    }
  });
}
