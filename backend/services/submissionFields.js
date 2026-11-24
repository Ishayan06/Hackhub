const pick = (s, keys) => {
  for (const k of keys) if (s[k]) return String(s[k]);
  return "";
};

exports.getFields = (s) => ({
  title: pick(s, ["title", "projectName", "name"]),
  description: pick(s, ["description", "projectDescription", "summary"]),
  url: pick(s, ["liveUrl", "hostedUrl", "deployedUrl", "projectUrl", "demoUrl", "url", "link"]),
  repo: pick(s, ["githubUrl", "repoUrl", "repository", "github"]),
});