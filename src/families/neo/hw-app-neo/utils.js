module.exports.foreach = function foreach(arr, callback) {
  function iterate(index, array, result) {
    if (index >= array.length) {
      return result;
    } else
      return callback(array[index], index).then(function(res) {
        result.push(res);
        return iterate(index + 1, array, result);
      });
  }
  return Promise.resolve().then(() => iterate(0, arr, []));
};
