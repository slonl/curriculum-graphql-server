# curriculum-graphql-server
GraphQL server for curriculum data. This server uses the curriculum-basis and curriculum-lpib github repositories as submodules.

## installation

### clone the repository

`git clone --recurse-submodules https://github.com/slonl/curriculum-graphql-server`

for older git versions (before 2.13) use:

```
git clone https://github.com/slonl/curriculum-graphql-server
cd curriculum-graphql-server
git submodule update --init
```

### install nodejs modules

if you haven't installed nodejs yet, then do that first.

```
cd json-graphql-server
npm install
```

### run the server

On unix / linux:

```
./run.sh
```

The GraphQL server starts at localhost on port 3000 by default.

## updating the dataset

The GraphQL server directly uses these datasets:
- https://github.com/slonl/curriculum-basis
- https://github.com/slonl/curriculum-lpib
- https://github.com/slonl/curriculum-kerndoelen
- https://github.com/slonl/curriculum-examenprogramma
- https://github.com/slonl/curriculum-examenprogramma-bg
- https://github.com/slonl/curriculum-syllabus

They are add as a submodule in the `data/` directory. This directory also
contains a file called `combined.json`. This file contains all the data 
from both datasets. Update it with the combine.js script

```
node ./combine.js
```

And then restart the GraphQL server.
