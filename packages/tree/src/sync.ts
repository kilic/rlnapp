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

	constructor(private readonly rln: Rln, private readonly tree: Tree, public memberSize: number) {
		const filter = rln.filters.MemberRegistered(null, null);
		rln.on(filter, this.memberRegistered);
	}

	get root(): string {
		return this.tree.root;
	}

	public async forceSync() {
		this.sync();
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

	private async sync() {
		const memberSize = (await this.rln.leafIndex()).toNumber();
		if (memberSize > this.memberSize) {
			const members = Array<string>(memberSize);
			if (memberSize > 0) {
				for (let i = 0; i < memberSize; i++) {
					members.push((await this.rln.members(i)).toHexString());
				}
				this.tree.updateBatch(0, members);
				this.memberSize = memberSize;
			}
		}
	}
}
