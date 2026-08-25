const fs = require("fs/promises")
const path = require("path")
const { rollup } = require("rollup")
const { minify } = require("terser")

const rootDir = path.join(__dirname, "..")
const sourcePath = path.join(rootDir, "src", "zousan.js")
const utilityBuilds = [
		{ source: "evaluate.js", output: "evaluate.cjs" },
		{ source: "series.js", output: "series.cjs" }
	]

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

async function buildUtilityBundle(sourceFile)
{
	const bundle = await rollup({
			input: path.join(rootDir, "src", sourceFile),
			external: id => id === sourcePath
		})

	try
	{
		const generated = await bundle.generate({
				format: "cjs",
				exports: "named",
				paths: id => id === sourcePath ? "../zousan-min.cjs" : id
			}),
			chunk = generated.output.find(output => output.type === "chunk")

		if(!chunk)
			throw Error("Rollup produced no CommonJS utility chunk for " + sourceFile)

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
	await fs.mkdir(path.join(rootDir,"dist"),{ recursive: true })

	const builds = [
			{ output: "zousan-min.cjs", contents: await buildBundle() }
		]

	for(const utility of utilityBuilds)
		builds.push({
				output: path.join("dist",utility.output),
				contents: await buildUtilityBundle(utility.source)
			})

	for(const build of builds)
		await replaceFile(path.join(rootDir, build.output), build.contents)
}

build().catch(err => {
		console.error(err)
		process.exitCode = 1
	})
