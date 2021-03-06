require('child_process').execSync('npm install @actions/core @actions/github', {
  cwd: __dirname,
})

const fs = require('fs')
const core = require('@actions/core')
const github = require('@actions/github')
// const api = new github.GitHub(core.getInput('token'))
const api = github.getOctokit(core.getInput('token'))

const getReleaseByTag = async (tag) => {
  let release
  try {
    release = await api.repos.getReleaseByTag({
      ...github.context.repo,
      tag,
    })
  } catch (err) {
    // console.log(err)
    console.log('Release not found.. moving to creation')
  }
  return release && release.data
}

const main = async () => {
  const name = core.getInput('name')
  const code = core.getInput('code')
  const body = core.getInput('body')
  const hash = core.getInput('hash')

  const prerelease = core.getInput('prerelease') == 'true'
  const recreate = core.getInput('recreate') == 'true'
  const assets = core
    .getInput('assets')
    .split(' ')
    .map((asset) => asset.split(':'))

  let release = await getReleaseByTag(code)

  const isSameCommit =
    release && release.target_commitish === github.context.sha

  if (recreate && !isSameCommit) {
    await deleteReleaseIfExists(code, release)
    delay(2000)
  }

  if (!release || (recreate && !isSameCommit)) {
    const createRelease = await api.repos.createRelease({
      ...github.context.repo,
      tag_name: code,
      target_commitish: github.context.sha,
      name,
      body,
      draft: false,
      prerelease: prerelease,
    })

    release = createRelease.data
  }

  for (const [source, target, type] of assets) {
    console.log('🚀 ~ file: action.js ~ line 63 ~ main ~ target', target)
    console.log('🚀 ~ file: action.js ~ line 63 ~ main ~ source', source)
    const data = fs.readFileSync(source)

    api.repos.uploadReleaseAsset({
      ...github.context.repo,
      release_id: release.id,
      headers: {
        ['content-type']: type,
        ['content-length']: data.length,
      },
      name: target,
      data: data,
    })
  }
}

async function deleteReleaseIfExists(code, release) {
  if (!release) {
    return
  }
  const deleteRelease = async () =>
    api.repos.deleteRelease({
      ...github.context.repo,
      release_id: release.id,
    })

  const deleteTagRef = async () => {
    const delTag = await api.git.deleteRef({
      ...github.context.repo,
      ref: `tags/${code}`,
    })

    return delTag
  }

  await retryOnFail(deleteRelease, 3)
  await retryOnFail(deleteTagRef, 3)
}

async function retryOnFail(asyncFunction, maxTries = 3) {
  if (maxTries < 1) {
    throw `Retried ${maxTries}.. failed always. aborting`
  }
  try {
    await delay(1000)
    return await asyncFunction()
  } catch (err) {
    console.log(err)
    console.log(`Retrying now...`)
    retryOnFail(asyncFunction, maxTries - 1)
  }
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

main().catch((error) => {
  console.error(error)
  core.setFailed(error.message)
})
