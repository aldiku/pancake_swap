import Web3 from "web3";
import {
  ChainId,
  Token,
  Fetcher,
  Route,
  Trade,
  CurrencyAmount,
  TradeType,
  Percent,
} from "@pancakeswap/sdk";



// Constants and Configurations
const BSC_NODE_URL = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(BSC_NODE_URL);
const PANCAKESWAP_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const FROM_TOKEN_ADDRESS = "0xF34a62AEC2b5f7917D43e45076E57c16a48054E9";
const fromAddress = "0xF34a62AEC2b5f7917D43e45076E57c16a48054E9";
const TO_TOKEN_ADDRESS = "0x5985cE6217E28Be9570A4a1DeF704A255f792CB4";
const FROM_TOKEN_DECIMALS = 18;
const TO_TOKEN_DECIMALS = 18;
const FROM_TOKEN_SYMBOL = "FROM";
const TO_TOKEN_SYMBOL = "TO";
const amountIn = web3.utils.toWei("1", "ether"); 
const slippage = 5; 
const privateKey = "YOUR_PRIVATE_KEY"; 

const IUniswapV2Router02ABI = [
  {
    constant: false,
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Create instance of router
const router = new web3.eth.Contract(
  IUniswapV2Router02ABI,
  PANCAKESWAP_ROUTER_ADDRESS
);

// Define Tokens
const fromToken = new Token(
  ChainId.BSC,
  FROM_TOKEN_ADDRESS,
  FROM_TOKEN_DECIMALS,
  FROM_TOKEN_SYMBOL,
  "From Token"
);

const toToken = new Token(
  ChainId.BSC,
  TO_TOKEN_ADDRESS,
  TO_TOKEN_DECIMALS,
  TO_TOKEN_SYMBOL,
  "To Token"
);

// Interface for swap preparation results
interface SwapPreparation {
  amountOutMin: string;
  path: string[];
  deadline: number;
}

async function prepareSwap(amountIn: string, slippageTolerance: number, fromAddress: string): Promise<SwapPreparation> {
    let pair;
    try {
        // Fetch pair data
        pair = await Fetcher.fetchPairData(fromToken, toToken, web3);
        if (!pair) {
            throw new Error('Pair data could not be fetched. Check if the token addresses are correct and supported.');
        }
    } catch (error) {
        console.error('Error fetching pair data:', error);
        throw error;
    }
    
    // Create a route based on the pair data
    const route = new Route([pair], fromToken, toToken);
    
    // Prepare transaction details
    const trade = new Trade(route, CurrencyAmount.fromRawAmount(fromToken, amountIn), TradeType.EXACT_INPUT);
    const slippageTolerancePercent = new Percent(slippageTolerance.toString(), '100');
    const amountOutMin = trade.minimumAmountOut(slippageTolerancePercent).quotient.toString();
    const path = [fromToken.address, toToken.address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

    console.log(`
    Amount In: ${amountIn}
    Amount Out Min: ${amountOutMin}
    Path: ${path}
    Deadline: ${deadline}
    `);

    return {
        amountOutMin,
        path,
        deadline
    };
}

async function swapTokens(
  amountIn: string,
  slippageTolerance: number,
  fromAddress: string,
  privateKey: string
): Promise<void> {
  try {
    const { amountOutMin, path, deadline } = await prepareSwap(
      amountIn,
      slippageTolerance,
      fromAddress
    );

    const tx = {
      from: fromAddress,
      to: PANCAKESWAP_ROUTER_ADDRESS,
      data: router.methods
        .swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          path,
          fromAddress,
          deadline
        )
        .encodeABI(),
      gas: 200000, // Estimated gas, can be adjusted
      gasPrice: await web3.eth.getGasPrice(),
    };

    // Sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    // Send the transaction to the network
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction as string
    );

    console.log("Transaction receipt:", receipt);
  } catch (error) {
    console.error("Error during token swap:", error);
  }
}

swapTokens(amountIn, slippage, fromAddress, privateKey);