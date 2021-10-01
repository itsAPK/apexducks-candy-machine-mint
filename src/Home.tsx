import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar,withStyles} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";


import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
 
  
} from "./candy-machine";

import logo from './logo.png'

const NavBar=styled.nav`
height: 85px;
display: flex;
justify-content: space-between;
z-index: 12;
padding:  30px;
font-weight :  1000;
font-size : 50px;

@media screen and (max-width: 768px) {
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
padding:  30px;
font-weight :  1000;
font-size : 30px;
}

`
 // add your styles here

const ConnectButton = withStyles({
  root: {
    background: '#000000',
    borderRadius: 5,
    border: 2,
    
    height: 48,
    fontSize : '15px',
    overflow :'hidden',
    fontWeight : 1000,
    padding: '0 30px',
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
  },
  label: {
    textTransform: 'capitalize',
  },
})(WalletDialogButton);


const CounterText = styled.span`
overflow : hidden;
`; // add your styles here

const MintContainer = styled.div`
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
padding:  50px;
font-weight :  1000;
font-size : 30px;
`; // add your styles here

const MintButton = withStyles({
  root: {
    background: 'black',
    borderRadius: 3,
    border: 0,
    color: '#ffbedf;',
    height: 48,
    width : 300,
    fontSize : '20px',
    overflow :'hidden',
    fontWeight : 1000,
    padding: '0 30px',
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
  },
  label: {
    textTransform: 'capitalize',
  },
})(Button); // add your styles here

const TextHeader=styled.h4`

font-weight :  800;
font-size : 20px;
`
//eslint-disable-next-line
const SecondryDiv=styled.div`
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
font-weight :  1000;
font-size : 30px;

`



export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });
  // eslint-disable-next-line
  const [rItems,setrItems] = useState<number>();
  const [redmeed,setItemRedeemed] = useState<number>();
  const [available,setItemsAvailable]=useState<number>();
  //eslint-disable-next-line
  const [progress,setPercentNow]=useState<number>();
  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
         
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;

      const { candyMachine, goLiveDate, itemsRemaining,itemsRedeemed,itemsAvailable} =
        await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection
        );  
      setrItems(itemsRemaining);
      setItemRedeemed(itemsRedeemed)
      setItemsAvailable(itemsAvailable)
      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
      setPercentNow(itemsRedeemed/itemsAvailable*100);

    })();
  }, [wallet, props.candyMachineId, props.connection]);
  
  

  return (
    <main>
      <NavBar>APEXDUCKS ™

      {!wallet.connected ?(<ConnectButton>Connect Wallet</ConnectButton>): (<ConnectButton disabled><TextHeader>{balance} SOL</TextHeader></ConnectButton>)}
      
      </NavBar>
      <SecondryDiv> <img src={logo} alt='apexducks logo' /></SecondryDiv>
      
      <MintContainer>
        
      {wallet.connected  && (<TextHeader> {redmeed} / {available} NFTs Minted </TextHeader>)}

        {wallet.connected  && (
          <MintButton 
            disabled={isSoldOut || isMinting || !isActive}
            onClick={onMint}
            variant="contained"
            color="primary"
          >
            {isSoldOut ? (
              "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
              ) : (
                "MINT"
              )
            ) : (
              <Countdown
                date={startDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
              
            )}
          </MintButton>
        )}          
        
        
       
        
      </MintContainer>
     

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
    {days} : {hours} : {minutes} : {seconds}
    </CounterText>
  );
};

export default Home;