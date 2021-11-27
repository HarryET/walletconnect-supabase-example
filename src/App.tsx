import React from "react";
import WalletConnectProvider from "@walletconnect/ethereum-provider";
import { providers, utils } from "ethers";
import { GoTrueClient, User } from "@supabase/gotrue-js";

// @ts-ignore
import logo from "./logo.svg";
import "./App.css";

function App() {
  const [chainId, setChainId] = React.useState<number>(1);
  const [address, setAddress] = React.useState<string>("");
  const [provider, setProvider] = React.useState<providers.Web3Provider>();
  const [user, setUser] = React.useState<User | null>(null);

  const gotrueClient = new GoTrueClient({
    url: process.env.REACT_APP_GOTRUE_URL
  })

  function reset() {
    console.log("reset");
    setAddress("");
    setProvider(undefined);
    setUser(null)
  }

  async function connect() {
    if (!process.env.REACT_APP_INFURA_ID) {
      throw new Error("Missing Infura Id");
    }

    const web3Provider = new WalletConnectProvider({
      infuraId: process.env.REACT_APP_INFURA_ID,
    });

    web3Provider.on("disconnect", reset);

    const accounts = (await web3Provider.enable()) as string[];
    setAddress(accounts[0]);
    setChainId(web3Provider.chainId);

    const provider = new providers.Web3Provider(web3Provider);
    setProvider(provider);
  }

  async function auth() {
    if (!provider) {
      throw new Error("Provider not connected");
    }
    const {data, error} = await gotrueClient.getNonce({
      wallet_address: address,
      chain_id: chainId
    });

    if(error != null) {
      throw new Error("Error generating nonce: " + error.message);
    }

    const nonce = data!;

    const sig = await provider.send("personal_sign", [nonce.nonce, address]);

    const valid = utils.verifyMessage(nonce.nonce, sig) === address;
    if(!valid) {
      throw new Error("failed to verify signature on client side!")
    }

    console.log(sig);
    console.log(nonce);

    const {session, error: lerror} = await gotrueClient.signInWithEth({
      wallet_address: address,
      nonce,
      signature: sig
    })

    if(lerror != null) {
      throw new Error("Error signing in: " + lerror.message);
    }

    if(session != null) {
      setUser(session.user)
    }

    console.log("Authenticated! 🎉")
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div>{provider ? "Connected!" : "Not connected"}</div>
        {address ? (
          <>
            <div>{address}</div>
            <div>{user != null ? <p>Supabase is Authenticated</p> : <p>Supabase is not Authenticated</p>}</div>
            <button onClick={auth}>Authenticate with Supabase</button>
            <button onClick={reset}>Logout & Reset</button>
          </>
        ) : (
          <button onClick={connect}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
