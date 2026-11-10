exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ message: msg });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value: " + Object.keys(err.keyValue).join(", ") });
  }
  res.status(err.status || 500).json({ message: err.message || "Server error" });
};
