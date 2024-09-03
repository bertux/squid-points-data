import fs from 'fs'
import assert from 'assert'
import {EvmBatchProcessor} from '@subsquid/evm-processor'
import * as lidoAbi from './abi/lidoStEth'
import {Database, LocalDest} from '@subsquid/file-store'
import {Column, Table, Types, dialects} from '@subsquid/file-store-csv'

const LIDO_STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'.toLowerCase()

const height = 19864533 // May-13-2024 11:59:59 PM +UTC

const processor = new EvmBatchProcessor()
	.setBlockRange({
		from: 19657201, // Apr-15-2024 12:00:11 AM +UTC
		to: height
	})
	.setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
	.addLog({
		address: [LIDO_STETH_ADDRESS],
		topic0: [lidoAbi.events.Submitted.topic],
		transaction: true
	})
	.setFields({
		log: {
			topics: true,
			data: true
		},
		transaction: {
			hash: true
		},
		block: {
			timestamp: true
		}
	})

const dbOptions = {
	tables: {
		TransfersTable: new Table(
			'lidoStakers.csv',
			{
//				txnHash: Column(Types.String()),
//				timestamp: Column(Types.Numeric()),
				sender: Column(Types.String()),
//				amount: Column(Types.String())
			}
		)
	},
	dest: new LocalDest('./assets/lidoStakers'),
	chunkSizeMb: Infinity
}

processor.run(new Database(dbOptions), async (ctx) => {
	for (let block of ctx.blocks) {
		for (let log of block.logs) {
			if (log.address===LIDO_STETH_ADDRESS &&
					log.topics[0]===lidoAbi.events.Submitted.topic) {

				let { sender, amount } = lidoAbi.events.Submitted.decode(log)

				ctx.store.TransfersTable.write({
//					txnHash: log.getTransaction().hash,
//					timestamp: block.header.timestamp,
					sender: sender.toLowerCase(),
//					amount: amount.toString()
				})
			}
		}
	}

	if (ctx.blocks[ctx.blocks.length-1].header.height >= height) {
		ctx.log.info(`Last processed block was at ${new Date(ctx.blocks[ctx.blocks.length-1].header.timestamp)}`)
		ctx.store.setForceFlush(true)
	}
})
