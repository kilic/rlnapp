# RLN Subtree Strategy

# Add to Queue

It is possible to add a new leaf to the queue anytime. There is no maximum que size while max set size is not exceeded.

# Merge: Constructing a Subtree

We can close some portion of queue. Witness path can be calculated on-chain with subtree offsets. Offsets of a merging subtree must conform to simple rule:

```python
require(mergeSize == mergeOffsetUpper - mergeOffsetLowr)
require(mergeSize == 1 << subtreeDepth)
require((mergeOffsetUpper - 1) >> subtreeDepth == mergeOffsetLower >> subtreeDepth)
```

Otherwise it means that a proper subtree cannot be constructed with given interval.

Closed subtree merges with the previous subtree if both height are same and similarly a merged subtree continiues to  merge with previous subtrees if there exists a subtree with same height.

Closed subtree root hashes are stored on-chain. Notice that there cannot be same level root hashes for different subtrees since we always merge them.

# Persist the top root

Top root is calculated with merged subtree roots and zeros. This call can be made just after a merge operation or after several merge operations.

Basically we calculate root hash ascending the path which is derived from offsets:

```python
if path & 1 == 1:
  H(acc, ZEROS[level])
else:
  H(filledSubtree[level], acc)
```


