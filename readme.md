# Om Nom
Simple tool to programmatically make API calls using a CSV file, which can then be turned into a TSV file. 

## Setup
1. clone this repo
2. `npm install`

## Usage
1. First you must have a CSV file that has some data that will be inserted into an API call. 

2. Next, get the URL you want to repeatedly hit for new information. For example, I used the Viddler API: `http://api.viddler.com/api/v2/viddler.videos.getDetails.json?video_id=881e2fbd`. Note: this tool currently only works for JSON data.

3. Replace the values of your request with the following template: `%title_of_column%`. For example, if I had a CSV file with a column named `video_id`, I could simply change the last parameter of the Viddler API to `%video_id%`

4. Figure out which columns you want to have in your final TSV output. Keep in mind you can choose any column name so long as it exists in the CSV file or as a key to a unique object in the JSON that is returned from your service.

5. Create your node command:

```
node index.js ./data/my-file.csv 'http://api.service.com/id/%id%' id,title,description,new_columns 200
```

Let's go through this step by step.
+`node index.js` just specifies to node what file you want to run.
+`./data/my-file/csv' is the path to the CSV file you're going to run.
+`id,title,description,new_columns` are the titles of the new columns.
+`200` is the maximum lines per output file.

After running this you should get an output with the names of your new files, complete with the data you requested!

# Liscense
MIT