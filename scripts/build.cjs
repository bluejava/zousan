const fs = require("fs/promises")
const path = require("path")
const { rollup } = require("rollup")
const { minify } = require("terser")

const rootDir = path.join(__dirname, "..")
const sourcePath = path.join(rootDir, "src", "zousan.js")

async function minifyCode(code,options)
{
	const result = await minify(code, Object.assign({
			compress: true,
			mangle: true
		}, options))

	if(result.error)
		throw result.error

	if(!result.code)
		throw Error("Minification produced no output")

	return result.code + "\n"
}

async function buildBundle()
{
	const bundle = await rollup({ input: sourcePath })

	try
	{
		const generated = await bundle.generate({ format: "umd", name: "Zousan" })
		const chunk = generated.output.find(output => output.type === "chunk")

		if(!chunk)
			throw Error("Rollup produced no UMD chunk")

		return minifyCode(chunk.code)
	}
	finally
	{
		await bundle.close()
	}
}

async function replaceFile(filePath,contents)
{
	const tempPath = filePath + ".tmp"

	await fs.writeFile(tempPath, contents)
	await fs.rename(tempPath, filePath)
}

async function build()
{
	const contents = await buildBundle()
	await replaceFile(path.join(rootDir, "zousan-min.cjs"), contents)
}

build().catch(err => {
		console.error(err)
		process.exitCode = 1
	})
