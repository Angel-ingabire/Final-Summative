import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  Contract,
  ContractTransactionResponse,
  ethers,
  parseUnits
} from "ethers";
import { deliveryTypes } from "./contracts/abis";
import {
  explainError,
  chainId,
  contracts,
  formatRwf,
  shortenAddress,
  settlementAddress,
  tokenAddress
} from "./services/blockchain";
import {
  listReceipts,
  QueuedReceipt,
  saveReceipt,
  updateReceipt
} from "./offline/receiptStore";

const DISPUTE_LABELS: Record<number, string> = {
  0: "Not recorded",
  1: "Allocated",
  2: "Disputed",
  3: "Claimed",
  4: "Rejected"
};
const RWF_TOKEN_SCALE = 6;

type WalletContracts = { settlement: Contract; token: Contract };
type DeliveryRow = {
  id: string;
  quantity: bigint;
  price: bigint;
  payment: bigint;
  grade: number;
  status: number;
  deliveredAt: bigint;
};

async function read(
  contract: Contract,
  functionName: string,
  ...args: unknown[]
): Promise<unknown> {
  return contract.getFunction(functionName).staticCall(...args);
}

async function send(
  contract: Contract,
  signer: Awaited<ReturnType<BrowserProvider["getSigner"]>>,
  functionName: string,
  ...args: unknown[]
): Promise<ContractTransactionResponse> {
  return contract.connect(signer).getFunction(functionName).send(...args);
}

function App() {
  const [signer, setSigner] = useState<Awaited<ReturnType<BrowserProvider["getSigner"]>> | null>(
    null
  );
  const [walletContracts, setWalletContracts] = useState<WalletContracts | null>(null);
  const [account, setAccount] = useState("");
  const [walletError, setWalletError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSepolia, setIsSepolia] = useState(false);
  const [isStation, setIsStation] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isResolver, setIsResolver] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTransaction, setLastTransaction] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [claimable, setClaimable] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [treasury, setTreasury] = useState({ balance: 0n, available: 0n, reserved: 0n, deposited: 0n, allocated: 0n });
  const [queue, setQueue] = useState<QueuedReceipt[]>([]);
  const [form, setForm] = useState({
    farmer: "",
    litres: "15",
    price: "500",
    grade: "1"
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [stationToAuthorize, setStationToAuthorize] = useState("");
  const [disputeId, setDisputeId] = useState("");

  const configured = Boolean(settlementAddress && tokenAddress);
  const networkLabel = useMemo(
    () => (isSepolia ? "Sepolia testnet" : "Switch to Sepolia"),
    [isSepolia]
  );

  const refreshAccess = useCallback(
    async (contractsForWallet: WalletContracts, walletAddress: string) => {
      const [stationRole, adminRole, resolverRole] = await Promise.all([
        read(contractsForWallet.settlement, "STATION_ROLE"),
        read(contractsForWallet.settlement, "DEFAULT_ADMIN_ROLE"),
        read(contractsForWallet.settlement, "RESOLVER_ROLE")
      ]);
      const [stationAccess, adminAccess, resolverAccess] = await Promise.all([
        read(contractsForWallet.settlement, "hasRole", stationRole, walletAddress),
        read(contractsForWallet.settlement, "hasRole", adminRole, walletAddress),
        read(contractsForWallet.settlement, "hasRole", resolverRole, walletAddress)
      ]);
      setIsStation(Boolean(stationAccess));
      setIsAdmin(Boolean(adminAccess));
      setIsResolver(Boolean(resolverAccess));
    },
    []
  );

  const loadWallet = useCallback(
    async (requestAccess: boolean) => {
      setWalletError("");
      if (!window.ethereum) {
        setWalletError("MetaMask was not detected. Install or enable it to connect.");
        return;
      }
      if (!configured) {
        setWalletError("Contract addresses are missing. Configure the Vite environment after deployment.");
        return;
      }
      try {
        const walletProvider = new BrowserProvider(window.ethereum);
        if (requestAccess) await walletProvider.send("eth_requestAccounts", []);
        else {
          const accounts = (await walletProvider.send("eth_accounts", [])) as string[];
          if (accounts.length === 0) {
            setAccount("");
            return;
          }
        }
        const walletSigner = await walletProvider.getSigner();
        const walletAddress = await walletSigner.getAddress();
        const network = await walletProvider.getNetwork();
        const connectedContracts = contracts(walletProvider);
        setSigner(walletSigner);
        setWalletContracts(connectedContracts);
        setAccount(walletAddress);
        setIsSepolia(Number(network.chainId) === chainId);
        await refreshAccess(connectedContracts, walletAddress);
      } catch (error) {
        setWalletError(explainError(error));
      }
    },
    [configured, refreshAccess]
  );

  useEffect(() => {
    void loadWallet(false);
    if (!window.ethereum) return;
    const accountsChanged = () => void loadWallet(false);
    const chainChanged = () => void loadWallet(false);
    window.ethereum.on("accountsChanged", accountsChanged);
    window.ethereum.on("chainChanged", chainChanged);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.ethereum?.removeListener("accountsChanged", accountsChanged);
      window.ethereum?.removeListener("chainChanged", chainChanged);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [loadWallet]);

  useEffect(() => {
    void listReceipts().then(setQueue).catch((error: unknown) => setNotice(explainError(error)));
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!walletContracts || !account || !isSepolia) return;
    try {
      const [ids, amount, balance, treasuryBalance, available, reserved, deposited, allocated] =
        await Promise.all([
          read(walletContracts.settlement, "getFarmerDeliveries", account),
          read(walletContracts.settlement, "getClaimableAmount", account),
          read(walletContracts.token, "balanceOf", account),
          read(walletContracts.settlement, "getTreasuryBalance"),
          read(walletContracts.settlement, "getAvailableTreasury"),
          read(walletContracts.settlement, "getReservedFunds"),
          read(walletContracts.settlement, "totalDeposited"),
          read(walletContracts.settlement, "totalSettlements")
        ]);
      const rows = await Promise.all(
        (ids as string[]).map(async (id) => {
          const details = (await read(walletContracts.settlement, "getDeliveryDetails", id)) as [
            { quantityMilliLitres: bigint; pricePerLitre: bigint; qualityGrade: bigint; deliveredAt: bigint },
            bigint,
            bigint
          ];
          return {
            id,
            quantity: details[0].quantityMilliLitres,
            price: details[0].pricePerLitre,
            grade: Number(details[0].qualityGrade),
            deliveredAt: details[0].deliveredAt,
            payment: details[1],
            status: Number(details[2])
          };
        })
      );
      setDeliveries(rows.reverse());
      setClaimable(amount as bigint);
      setTokenBalance(balance as bigint);
      setTreasury({
        balance: treasuryBalance as bigint,
        available: available as bigint,
        reserved: reserved as bigint,
        deposited: deposited as bigint,
        allocated: allocated as bigint
      });
    } catch (error) {
      setNotice(`Unable to load current contract data: ${explainError(error)}`);
    }
  }, [walletContracts, account, isSepolia]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const switchToSepolia = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 4902) {
        try {
          await window.ethereum?.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"]
            }]
          });
        } catch (addError) {
          setWalletError(explainError(addError));
        }
      } else {
        setWalletError(explainError(error));
      }
    }
  };

  const runTransaction = async (
    contract: Contract,
    functionName: string,
    ...args: unknown[]
  ) => {
    if (!signer || !isSepolia) {
      setWalletError("Connect a wallet on Sepolia before submitting a transaction.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const transaction = await send(contract, signer, functionName, ...args);
      setLastTransaction(transaction.hash);
      setNotice(`Transaction submitted: ${transaction.hash}. Waiting for confirmation…`);
      await transaction.wait();
      setNotice(`Transaction confirmed: ${transaction.hash}`);
      await refreshDashboard();
    } catch (error) {
      setNotice(`Transaction failed: ${explainError(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const syncReceipts = useCallback(
    async (receipts?: QueuedReceipt[]) => {
      if (!walletContracts || !signer || !isStation || !isSepolia || !navigator.onLine) return;
      setBusy(true);
      for (const receipt of receipts ?? await listReceipts()) {
        if (receipt.status === "synchronized") continue;
        const id = receipt.delivery.deliveryId;
        try {
          const current = (await read(walletContracts.settlement, "getDeliveryDetails", id)) as [
            unknown,
            bigint,
            bigint
          ];
          if (Number(current[2]) !== 0) {
            await updateReceipt(id, {
              status: "synchronized",
              error: "Delivery ID was already recorded on-chain."
            });
            continue;
          }
          const delivery = {
            ...receipt.delivery,
            quantityMilliLitres: BigInt(receipt.delivery.quantityMilliLitres),
            pricePerLitre: BigInt(receipt.delivery.pricePerLitre),
            deliveredAt: BigInt(receipt.delivery.deliveredAt),
            deadline: BigInt(receipt.delivery.deadline)
          };
          const transaction = await send(
            walletContracts.settlement,
            signer,
            "recordDelivery",
            delivery,
            receipt.signature
          );
          await updateReceipt(id, {
            status: "pending",
            transactionHash: transaction.hash,
            error: "Transaction submitted; waiting for confirmation."
          });
          setLastTransaction(transaction.hash);
          await transaction.wait();
          await updateReceipt(id, {
            status: "synchronized",
            transactionHash: transaction.hash,
            error: undefined
          });
        } catch (error) {
          await updateReceipt(id, { status: "failed", error: explainError(error) });
        }
      }
      setQueue(await listReceipts());
      setBusy(false);
      await refreshDashboard();
    },
    [walletContracts, signer, isStation, isSepolia, refreshDashboard]
  );

  useEffect(() => {
    if (!isOnline || !isStation || !isSepolia) return;
    void syncReceipts();
  }, [isOnline, isStation, isSepolia, syncReceipts]);

  const createSignedReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signer || !walletContracts || !isStation || !isSepolia) return;
    try {
      if (!ethers.isAddress(form.farmer)) throw new Error("Enter a valid farmer wallet address.");
      if (!/^\d+(\.\d{1,3})?$/.test(form.litres) || Number(form.litres) <= 0) {
        throw new Error("Enter a positive milk quantity with at most three decimal places.");
      }
      if (!/^\d+$/.test(form.price) || BigInt(form.price) <= 0n) {
        throw new Error("Enter a positive whole-number price in simulated RWF per litre.");
      }
      const qualityGrade = Number(form.grade);
      if (!Number.isInteger(qualityGrade) || qualityGrade < 1 || qualityGrade > 5) {
        throw new Error("Quality grade must be from 1 to 5.");
      }
      const now = Math.floor(Date.now() / 1000);
      const delivery = {
        deliveryId: ethers.id(crypto.randomUUID()),
        farmer: form.farmer,
        quantityMilliLitres: parseUnits(form.litres, 3),
        pricePerLitre: BigInt(form.price),
        qualityGrade,
        deliveredAt: BigInt(now),
        deadline: BigInt(now + 24 * 60 * 60)
      };
      const signature = await signer.signTypedData(
        {
          name: "AmataSettle",
          version: "1",
          chainId: BigInt(chainId),
          verifyingContract: settlementAddress
        },
        deliveryTypes,
        delivery
      );
      const receipt: QueuedReceipt = {
        delivery: {
          ...delivery,
          quantityMilliLitres: delivery.quantityMilliLitres.toString(),
          pricePerLitre: delivery.pricePerLitre.toString(),
          deliveredAt: delivery.deliveredAt.toString(),
          deadline: delivery.deadline.toString()
        },
        signature,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      await saveReceipt(receipt);
      setQueue(await listReceipts());
      setNotice(`Signed receipt saved locally (${shortenAddress(receipt.delivery.deliveryId)}). ${
        isOnline ? "It will now be synchronized." : "It is pending until connectivity returns."
      }`);
      if (isOnline) await syncReceipts([receipt]);
    } catch (error) {
      setNotice(`Receipt was not created: ${explainError(error)}`);
    }
  };

  const handleDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!walletContracts || !signer || !account) return;
    try {
      const amount = parseUnits(depositAmount, RWF_TOKEN_SCALE);
      if (amount <= 0n) throw new Error("Enter a deposit amount greater than zero.");
      const allowance = (await read(
        walletContracts.token,
        "allowance",
        account,
        settlementAddress
      )) as bigint;
      if (allowance < amount) {
        const approval = await send(walletContracts.token, signer, "approve", settlementAddress, amount);
        setLastTransaction(approval.hash);
        await approval.wait();
      }
      await runTransaction(walletContracts.settlement, "depositFunds", amount);
      setDepositAmount("");
    } catch (error) {
      setNotice(`Deposit could not be prepared: ${explainError(error)}`);
    }
  };

  const resolveDispute = async (uphold: boolean) => {
    if (!walletContracts || !ethers.isHexString(disputeId, 32)) {
      setNotice("Enter a valid 32-byte delivery ID to resolve.");
      return;
    }
    await runTransaction(walletContracts.settlement, "resolveDispute", disputeId, uphold);
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-sand bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a className="flex items-center gap-3" href="#home" aria-label="AmataSettle home">
            <span className="brand-mark">A</span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-forest">AmataSettle</span>
              <span className="block text-xs text-stone-500">Dairy settlements, made verifiable</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className={`status-pill ${isOnline ? "status-online" : "status-offline"}`}>
              <span className="status-dot" /> {isOnline ? "Online" : "Offline"}
            </span>
            {!account ? (
              <button className="button-primary" onClick={() => void loadWallet(true)}>
                Connect wallet
              </button>
            ) : (
              <button className="button-secondary" onClick={() => void loadWallet(false)}>
                {shortenAddress(account)}
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="home" className="mx-auto max-w-7xl px-5 pb-16">
        <section className="hero-grid py-12 md:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow">A cooperative finance prototype for Rwanda</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-forest md:text-6xl">
              Every delivery deserves a record you can verify.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
              AmataSettle connects signed milk-delivery receipts to transparent cooperative
              settlements—even when a collection station is temporarily offline.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {!account && <button className="button-primary" onClick={() => void loadWallet(true)}>Connect wallet</button>}
              <a className="button-secondary" href="#workspace">Explore the workspace</a>
            </div>
            <p className="mt-5 text-xs leading-5 text-stone-500">
              Prototype only. mRWF is a simulated test token and has no real-world value.
            </p>
          </div>
          <div className="hero-art" aria-label="Illustration of a dairy delivery receipt">
            <div className="receipt-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-forest">Delivery receipt</span>
                <span className="verified-tag">SIGNED</span>
              </div>
              <div className="my-7 flex items-end justify-between border-b border-dashed border-sand pb-5">
                <div><p className="text-xs text-stone-500">Milk received</p><p className="mt-1 text-3xl font-semibold">15.0 L</p></div>
                <span className="milk-icon">✳</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Settlement value</span><strong>7,500 mRWF</strong></div>
              <div className="mt-4 flex items-center gap-2 text-xs text-leaf"><span className="status-dot" /> Ready to synchronize</div>
            </div>
            <div className="art-note"><span className="note-icon">↗</span><span>Offline first<br /><b>On-chain when ready</b></span></div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="info-card"><p className="card-kicker">01 / Capture</p><h2>Record the delivery</h2><p>The station signs the delivery fields with its authorized wallet, making later changes detectable.</p></article>
          <article className="info-card"><p className="card-kicker">02 / Verify</p><h2>Reserve the obligation</h2><p>The contract checks the signature, delivery ID, deadline, and treasury before recording a settlement allocation.</p></article>
          <article className="info-card"><p className="card-kicker">03 / Settle</p><h2>Claim or dispute</h2><p>Farmers claim eligible allocations. A dispute freezes the reserved amount until an authorized resolver decides.</p></article>
        </section>

        <section id="workspace" className="mt-14 scroll-mt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Live workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-forest">Cooperative settlement desk</h2>
            </div>
            {account && <div className="flex items-center gap-2"><span className={`status-pill ${isSepolia ? "status-online" : "status-offline"}`}>{networkLabel}</span>{!isSepolia && <button className="button-secondary" onClick={() => void switchToSepolia()}>Switch network</button>}</div>}
          </div>

          {(walletError || notice) && (
            <div className={`notice ${walletError ? "notice-error" : "notice-info"}`} role="status">
              <span>{walletError || notice}</span>
              {lastTransaction && <a href={`https://sepolia.etherscan.io/tx/${lastTransaction}`} target="_blank" rel="noreferrer">View transaction ↗</a>}
            </div>
          )}
          {!configured && <div className="notice notice-error mt-4">Set VITE_AMATASETTLE_ADDRESS and VITE_MOCKRWF_ADDRESS in frontend/.env.local after deploying contracts.</div>}
          {!account && <div className="empty-panel mt-5"><p className="text-lg font-semibold">Connect MetaMask to use the live dashboards</p><p className="mt-2 text-sm text-stone-500">All workspace data is read from the configured contract; this page does not use mock delivery records.</p></div>}

          {account && <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-5">
              <section className="panel">
                <div className="panel-heading"><div><p className="card-kicker">Farmer view</p><h3>Your deliveries & settlements</h3></div><button className="button-text" onClick={() => void refreshDashboard()}>Refresh</button></div>
                <div className="metric-grid">
                  <Metric label="Delivered" value={`${(deliveries.reduce((sum, item) => sum + item.quantity, 0n) / 1000n).toLocaleString()} L`} />
                  <Metric label="Claimable" value={formatRwf(claimable)} />
                  <Metric label="Token balance" value={formatRwf(tokenBalance)} />
                </div>
                <div className="table-wrap mt-5">
                  {deliveries.length === 0 ? <p className="py-7 text-center text-sm text-stone-500">No delivery records are linked to this wallet yet.</p> : (
                    <table><thead><tr><th>Delivery ID</th><th>Quantity</th><th>Settlement</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>{deliveries.map((delivery) => <tr key={delivery.id}>
                        <td className="font-mono text-xs">{shortenAddress(delivery.id)}</td>
                        <td>{(Number(delivery.quantity) / 1000).toLocaleString()} L</td>
                        <td>{formatRwf(delivery.payment)}</td>
                        <td><span className={`state-tag state-${delivery.status}`}>{DISPUTE_LABELS[delivery.status]}</span></td>
                        <td><div className="flex gap-2">
                          {delivery.status === 1 && <button disabled={busy || !isSepolia} className="small-action" onClick={() => walletContracts && void runTransaction(walletContracts.settlement, "claimPayment", delivery.id)}>Claim</button>}
                          {delivery.status === 1 && <button disabled={busy || !isSepolia} className="small-action subtle" onClick={() => {
                            const reason = window.prompt("Briefly describe the delivery issue:");
                            if (reason && walletContracts) void runTransaction(walletContracts.settlement, "raiseDispute", delivery.id, reason);
                          }}>Dispute</button>}
                        </div></td>
                      </tr>)}</tbody>
                    </table>
                  )}
                </div>
              </section>

              {isStation && <section className="panel">
                <div className="panel-heading"><div><p className="card-kicker">Collection station</p><h3>Create a signed receipt</h3></div><span className="verified-tag">AUTHORIZED</span></div>
                <form className="form-grid" onSubmit={(event) => void createSignedReceipt(event)}>
                  <label className="field full">Farmer wallet address<input required value={form.farmer} onChange={(event) => setForm({ ...form, farmer: event.target.value })} placeholder="0x…" /></label>
                  <label className="field">Milk quantity (litres)<input required type="number" min="0.001" step="0.001" value={form.litres} onChange={(event) => setForm({ ...form, litres: event.target.value })} /></label>
                  <label className="field">Price (simulated RWF / litre)<input required type="number" min="1" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
                  <label className="field">Quality grade (1–5)<select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}><option value="1">1 · Standard</option><option value="2">2 · Good</option><option value="3">3 · Very good</option><option value="4">4 · Excellent</option><option value="5">5 · Premium</option></select></label>
                  <div className="field self-end"><button className="button-primary w-full" disabled={busy || !isSepolia}>Sign & save receipt</button></div>
                </form>
                <p className="mt-3 text-xs leading-5 text-stone-500">The signed message binds the receipt to this contract and chain. A signature authenticates the station key, not the physical measurement.</p>
                <div className="mt-6 border-t border-sand pt-5">
                  <div className="panel-heading"><h4>Local synchronization queue</h4><button className="button-text" disabled={busy || !isOnline} onClick={() => void syncReceipts()}>Sync pending</button></div>
                  {queue.length === 0 ? <p className="mt-4 text-sm text-stone-500">No locally saved receipts.</p> : <div className="mt-3 space-y-2">{queue.map((receipt) => <div key={receipt.delivery.deliveryId} className="queue-row">
                    <div><p className="font-mono text-xs">{shortenAddress(receipt.delivery.deliveryId)}</p><p className="mt-1 text-xs text-stone-500">{new Date(receipt.createdAt).toLocaleString()}</p></div>
                    <span className={`state-tag ${receipt.status === "synchronized" ? "state-3" : receipt.status === "failed" ? "state-4" : "state-2"}`}>{receipt.status}</span>
                    {receipt.status !== "synchronized" && <button className="button-text" disabled={busy || !isOnline} onClick={() => void syncReceipts([receipt])}>Retry</button>}
                    {receipt.transactionHash && <a className="button-text" href={`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">Explorer ↗</a>}
                    {receipt.error && <p className="queue-error">{receipt.error}</p>}
                  </div>)}</div>}
                </div>
              </section>}
            </div>

            <aside className="space-y-5">
              <section className="panel">
                <div className="panel-heading"><div><p className="card-kicker">Cooperative treasury</p><h3>Funds & liabilities</h3></div></div>
                <div className="space-y-4">
                  <Metric label="Contract token balance" value={formatRwf(treasury.balance)} />
                  <Metric label="Available" value={formatRwf(treasury.available)} />
                  <Metric label="Reserved obligations" value={formatRwf(treasury.reserved)} />
                  <Metric label="Total deposited" value={formatRwf(treasury.deposited)} />
                  <Metric label="Total allocations" value={formatRwf(treasury.allocated)} />
                </div>
                {isAdmin && <div className="mt-6 border-t border-sand pt-5">
                  <form onSubmit={(event) => void handleDeposit(event)} className="space-y-3">
                    <label className="field">Deposit simulated mRWF<input required type="number" min="0.000001" step="0.000001" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} placeholder="e.g. 100000" /></label>
                    <button className="button-primary w-full" disabled={busy || !isSepolia}>Approve & deposit</button>
                  </form>
                  <button className="button-secondary mt-3 w-full" disabled={busy || !isSepolia} onClick={() => walletContracts && void runTransaction(walletContracts.settlement, "withdrawUnallocatedFunds", account, parseUnits(depositAmount || "0", RWF_TOKEN_SCALE))}>Withdraw entered amount</button>
                  <label className="field mt-5">Authorize station wallet<input value={stationToAuthorize} onChange={(event) => setStationToAuthorize(event.target.value)} placeholder="0x…" /></label>
                  <button className="button-secondary mt-2 w-full" disabled={busy || !isSepolia || !ethers.isAddress(stationToAuthorize)} onClick={() => walletContracts && void runTransaction(walletContracts.settlement, "authorizeStation", stationToAuthorize)}>Authorize station</button>
                  <button className="button-text mt-3" disabled={busy || !isSepolia} onClick={() => walletContracts && void runTransaction(walletContracts.token, "mint", account, parseUnits("100000", RWF_TOKEN_SCALE))}>Mint 100,000 demo mRWF to this wallet</button>
                </div>}
              </section>

              {isResolver && <section className="panel">
                <div className="panel-heading"><div><p className="card-kicker">Dispute resolution</p><h3>Review a delivery</h3></div></div>
                <label className="field">Delivery ID<input value={disputeId} onChange={(event) => setDisputeId(event.target.value)} placeholder="0x + 64 hex characters" /></label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="button-secondary" disabled={busy || !isSepolia} onClick={() => void resolveDispute(true)}>Uphold payment</button>
                  <button className="button-danger" disabled={busy || !isSepolia} onClick={() => void resolveDispute(false)}>Reject payment</button>
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">Resolver decisions are recorded on-chain. Review evidence outside this prototype before deciding.</p>
              </section>}

              <section className="disclosure">
                <p className="font-semibold text-forest">Prototype disclosures</p>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-stone-600">
                  <li>mRWF is a test token only; it is not redeemable and is not Rwandan legal tender.</li>
                  <li>Receipts remain on this browser until confirmed. Clearing site data can remove pending receipts.</li>
                  <li>Contract data is public. Do not enter sensitive personal information in a dispute reason.</li>
                </ul>
              </section>
            </aside>
          </div>}
        </section>

        <footer className="mt-14 border-t border-sand py-7 text-center text-xs text-stone-500">
          AmataSettle · Academic prototype · Ethereum Sepolia · No real funds
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric-row"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
