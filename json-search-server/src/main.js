const express = require('express')
const { Index } = require('flexsearch')
const { keys } = require('memory-cache')
const cors = require('cors')

const app = express()
app.use(cors())

const index = new Index()
const port = process.env.NODE_PORT || 3701

const dataDir = process.env.DATA_DIR || '../data'
const apiDir = process.env.API_DIR || '.'

const curriculumAPI = require(apiDir + '/curriculum')
const curriculum = curriculumAPI.create()

const dataset = [
    'basis',
    'kerndoelen',
    'leerdoelenkaarten',
    'examenprogramma',
    'examenprogramma-bg',
    'syllabus',
    'inhoudslijnen',
    'referentiekader',
    'doelgroepteksten'
]

let schemas = []

dataset.forEach(set => {
    schemas[set] = curriculum.loadSchema(
        dataDir + '/curriculum-' + set + '/context.json', 
        dataDir + '/curriculum-' + set + '/'
    )
})

Object.keys(curriculum.index.id).forEach(id => {
    if (curriculum.index.id[id] && curriculum.index.id[id].title) {
        index.add(id, curriculum.index.id[id].title, curriculum.index.id[id].description)
    }
})

app.route('/search').get((req,res) => {
    if (!req.query || !req.query.text) {
        res.status(400)
        res.render('error: missing search parameter &quot;text&quot;');
    } else {
        const ids = index.search(req.query.text)
        let results = []
        ids.forEach(id => {
            const obj = Object.assign(
                {
                    '@type': curriculum.index.type[id],
                    '@schema': curriculum.index.schema[id]
                },
                curriculum.index.id[id]
            )
            
            results.push(obj)
        })
        res.json(results)
    }        
})

app.listen(port, () => console.log(`JSON text search server listening on port ${port}!`))
