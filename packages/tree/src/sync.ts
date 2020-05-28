import { Tree } from './tree';
import { Rln } from './generated_contract_wrappers/Rln';
import { RlnFactory } from './generated_contract_wrappers/RlnFactory';
import { Provider } from 'ethers/providers';
import { Hasher } from './hasher';
import { utils } from 'ethers';
const assert = require('assert');
type BigNumber = utils.BigNumber;

export class TreeSync {
	// TODO: add option to boot from a milestone
	static async new(hasher: Hasher, rlnAddress: string, provider: Provider): Promise<TreeSync> {
		const rln = RlnFactory.connect(rlnAddress, provider);
		assert(hasher.identity == (await rln.hasherIdentity()));
		const depth = (await rln.DEPTH()).toNumber();
		const tree = Tree.new(depth, hasher);
		const memberSize = (await rln.leafIndex()).toNumber();
		const members = Array<string>(memberSize);
		if (memberSize > 0) {
			for (let i = 0; i < memberSize; i++) {
				members[i] = (await rln.members(i)).toHexString();
			}
			tree.updateBatch(0, members);
		}
		return new TreeSync(rln, tree, memberSize);
	}
	constructor(private rln: Rln, private readonly tree: Tree, public memberSize: number) {
		this.listen();
		// check member size from contract and xyz
	}

	get root(): string {
		return this.tree.root;
	}

	public async updateProvider(provider: Provider): Promise<number> {
		this.stopListening();
		this.rln = this.rln.connect(provider);
		this.listen();
		return this.forceSync();
	}

	public async forceSync(): Promise<number> {
		try {
			await this.rln.provider.getNetwork();
			await this.sync();
			return 0;
		} catch (err) {
			return -1;
		}
	}

	private async sync() {
		const memberSize = (await this.rln.leafIndex()).toNumber();
		const n = memberSize - this.memberSize;
		if (n > 0) {
			const off = this.memberSize;
			this.memberSize = memberSize;
			const members = Array<string>(n);
			for (let i = 0; i < n; i++) {
				members[i] = (await this.rln.members(i + off)).toHexString();
			}
			this.tree.updateBatch(off, members);
		}
	}

	private listen() {
		this.rln.on(this.filter, this.memberRegistered);
	}

	private stopListening() {
		this.rln.removeAllListeners(this.filter);
	}

	private get filter() {
		return this.rln.filters.MemberRegistered(null, null);
	}

	private memberRegistered = (pubkey: BigNumber, leafIndex: BigNumber) => {
		const eventMemberSize = leafIndex.toNumber() + 1;
		// no process if event is lt accumulated size
		if (eventMemberSize > this.memberSize) {
			if (eventMemberSize == this.memberSize + 1) {
				// single update works in order to sync the tree
				this.memberSize = eventMemberSize;
				this.tree.updateSingle(eventMemberSize - 1, pubkey.toHexString());
			} else {
				this.sync();
			}
		}
	};
}
