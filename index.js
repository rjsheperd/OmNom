var request  = require('request')
  , fs = require('fs')
  , csv = require('csv')
  , transform = csv.transform
  , parse = csv.parse
  , stringify = csv.stringify;

// User provided arguments
// Filename
var f = process.argv[2]; 

// URL of API to reference
var inputUrl = process.argv[3];

// The columns of the output document
var newColumns = process.argv[4];

// Maximum # of lines per output document
var maxLines = process.argv[5] || 400;

// Create stream
var csvInput = fs.createReadStream(f);

// Set up parser. Automatically figures out the columns using the first line
var columns = [];
var parser = parse({ 
    columns: function(val) {
      columns = val;
      console.log('Identified columns: ', columns, '\n');
    }
  });

// Set up Object Mapper to CSV/TSV stringifier
var stringifier = stringify({
    delimiter: '\t',
    columns: newColumns.split(','),
    header: true // Done in toTSV()
  });

// Maps the row, which is an array to an object with columns as the keys
var mapToObject = transform(function(data, callback) {
  var row = {};
  data.forEach(function(val, i) { row[columns[i]] = val; } );
  callback(null, row);
});

/**
 * replaceUrlData
 * @param {String} url
 * @param {Object} data
 * @return {String} url
 * @description Does a simple replacing scheme using the %key% templating scheme.
 * @example 
 *     url = http://api.web.service/id/%id% and data = { id: abc123 } will output:
 *     http://api.web.service/id/abc123
 */
var replaceUrlData = function(url, data) {
  var matchObjects
    , re = /%\w+%/g
    , matches = url.match(re);

  if (matches) {
    matchObjects = matches.map(function(m) { 
      return { 'token': m, 'key': m.replace(/%/g,'') };
    });
    
    matchObjects.forEach(function(match) { 
      var key = match['key'];
      if (data[key]) {
        url = url.replace(match['token'], data[key]); 
      }
    });
  }

  return url;
}

/**
 * requestJSON
 * @description requests the JSON from the transformed URL using row data
 * @callback {Object} data   contains row and json data.
 */
var requestJson = transform(function(row, callback) {
  if (!inputUrl) throw new Error('Please provide a URL');
  // if (!inputUrl.test('http:\/\/')) throw new Error('URL must start with http://');
  var url = replaceUrlData(inputUrl, row);
  request(url, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      var data = {row: row, json: JSON.parse(body)};
      callback(null, data);
    } else {
      callback(err);
    }
  });
  return url + '\n';
});

var removeTabsNewlines = function(str) {
  return str.replace(/[\t\n]/g, '');
}

var isObject = function(obj) {
  return typeof(obj) === typeof({});
}

/**
 * deepFind 
 * @param {Object} obj
 * @param {String} key
 * @description Recursively searches through object to find matching target key
 * and returns the result
 */
var deepFind = function(obj, target) {
  if (!isObject(obj)) return null;
  var keys = Object.keys(obj);
  if (keys.indexOf(target) !== -1) return obj[target];
  var value = null;
  for (var i = 0; i < keys.length; i += 1) {
    if (typeof(obj[keys[i]]) === 'object') {
      value = deepFind(obj[keys[i]], target);
    }
    if (value) break;
  }
  return value;
}

/**
 * makeOutput
 * @description Iterates through new columns and creates a new output object with
 * CSV or JSON data mapped to respective columns
 */
var makeOutput = transform(function(data) {
  var cols
    , row = data.row
    , json = data.json
    , output = {};

  if (newColumns) {
    cols = newColumns.split(',');
  } else {
    cols = columns;
  }

  var rowKeys = Object.keys(row);
  cols.forEach(function(col) {
    if (rowKeys.indexOf(col) !== -1) {
      output[col] = row[col];
    } else {
      output[col] = removeTabsNewlines( deepFind(json, col) );
    }
  });

  // console.log(output);

  return output;

});

var writeLine = 0
  , fileNumber = 0
  , newFile;
var tsvOutput;

/**
 * toTSV
 * @description Writes rows to TSV file without going over the maximum line limit
 */
var toTSV = transform(function(row) {

  if (writeLine % maxLines === 0) {
    if (tsvOutput) tsvOutput.end();
    newFile = f.replace('.csv','-' + fileNumber + '.tsv');
    tsvOutput = fs.createWriteStream(newFile);
    console.log('Starting to write to ', newFile);
    if ( writeLine !== 0) {
      tsvOutput.write(newColumns.split(',').join('\t') + '\n');
    }
    fileNumber += 1;
  }

  tsvOutput.write(row);
  writeLine += 1;
});

csvInput
  .pipe(parser)
  .pipe(mapToObject)
  .pipe(requestJson)
  .pipe(makeOutput)
  .pipe(stringifier)
  .pipe(toTSV);

// Helpful console logs
console.log('Grabbing file: ', f, '\n');
console.log('Using URL: ', inputUrl, '\n');
console.log('New Columns: ', newColumns.split(',').join(', '), '\n');
console.log('Lines per output file: ', maxLines, '\n');
