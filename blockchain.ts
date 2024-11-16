import * as crypto from "crypto-js";

export interface BlockData {
  userId: string;
  candidateId: string;
  timestamp: string;
}

export class Block {
  index: number;
  timestamp: string;
  data: BlockData;
  previousHash: string;
  hash: string;

  constructor(index: number, timestamp: string, data: BlockData, previousHash: string = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  // Calculate the hash for the block
  calculateHash(): string {
    return crypto
      .SHA256(
        this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data)
      )
      .toString();
  }

  // Serialize block to a plain object for Firebase compatibility
  toJSON(): Record<string, any> {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      hash: this.hash,
    };
  }

  // Deserialize a plain object back to a Block instance
  static fromJSON(json: Record<string, any>): Block {
    return new Block(
      json.index,
      json.timestamp,
      json.data,
      json.previousHash
    );
  }
}

export class Blockchain {
  private chain: Block[];

  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  // Create the first block in the blockchain
  private createGenesisBlock(): Block {
    return new Block(0, new Date().toISOString(), { userId: "0", candidateId: "0", timestamp: "" }, "0");
  }

  // Get the latest block in the chain
  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  // Add a new block to the blockchain
  public addBlock(data: BlockData): void {
    const newBlock = new Block(
      this.chain.length,
      new Date().toISOString(),
      data,
      this.getLatestBlock().hash
    );
    this.chain.push(newBlock);
  }

  // Check if the blockchain is valid
  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Validate hash integrity
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Validate chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  // Get the entire blockchain as an array of blocks
  public getChain(): Block[] {
    return this.chain;
  }

  // Serialize the entire blockchain for Firebase
  public serializeChain(): Record<string, any>[] {
    return this.chain.map((block) => block.toJSON());
  }

  // Deserialize a chain from Firebase back into a Blockchain instance
  public loadChain(serializedChain: Record<string, any>[]): void {
    this.chain = serializedChain.map((blockData) => Block.fromJSON(blockData));
  }
}
