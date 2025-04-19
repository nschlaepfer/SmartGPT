// Test file to check hnswlib-node (v2.1.1) usage with TypeScript
import hnswlib from "hnswlib-node";
// We can see that only 'default' is exported, need to use default import

console.log("Available exports in hnswlib-node:");
console.log(Object.keys(hnswlib));

try {
  const dim = 128;
  const spaceType = "cosine";

  // Try using HierarchicalNSW directly since it's available
  if (hnswlib.HierarchicalNSW) {
    console.log("Found HierarchicalNSW, attempting to use it");
    const index = new hnswlib.HierarchicalNSW(spaceType, dim);
    console.log("Successfully created HierarchicalNSW index");

    // Test basic methods
    index.initIndex(1000, 16, 200, 100);
    console.log("Successfully initialized index");

    // Try adding a point
    const vector = new Array(dim).fill(0).map(() => Math.random());
    index.addPoint(vector, 0);
    console.log("Successfully added a point");

    // Try searching
    const { distances, neighbors } = index.searchKnn(vector, 1);
    console.log(
      "Search results - distances:",
      distances,
      "neighbors:",
      neighbors
    );
  } else {
    console.log("HierarchicalNSW not found in exports");
  }
} catch (error) {
  console.error("Error working with index:", error);
}
