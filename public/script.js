// UPDATE THIS PREFIX TO POINT TO WHEREVER YOUR JSONS ARE
const JSON_PREFIX='http://localhost/songlist'

const languageMapping = {
    Austrian: 'at',
    Chinese: 'cn',
    Czech: 'cz',
    English: 'gb',
    Dutch: 'nl',
    French: 'fr',
    German: 'de',
    Hungarian: 'hu',
    Italian: 'it',
    Japanese: 'jp',
    Korean: 'kr',
    Latin: 'va',
    Norwegian: 'no',
    Other: 'xx',
    Polish: 'pl',
    Romanian: 'ro',
    Russian: 'ru',
    Spanish: 'es',
    Swedish: 'se',
    Ukrainian: 'ua',
}

for (const language in languageMapping) {
    const link = document.createElement('link')
    link.href = `language-icons/${languageMapping[language]}.svg`
    link.rel = 'prefetch'
    link.as = 'image'
    link.type = 'image/svg+xml'
    document.head.appendChild(link)
}

let ponySongs = { songlist: [] }
let nonPonySongs = { songlist: [] }
let shimmerSongs = { songlist: [] }

let tbody = null
let currentSearch = ''
let clearSearch = null
const currentYear = new Date().getFullYear()

// enum Variant {
//   // base values
//   LOSSY = 0,
//   LOSSLESS = 1,
//   INSTRUMENTAL = 2,
//   DUET = 4,
//   // combinations
//   INSTRUMENTAL_DUET = 6,
//   LOSSLESS_INSTRUMENTAL = 3,
//   LOSSLESS_DUET = 5,
//   LOSSLESS_INSTRUMENTAL_DUET = 7,
// }

function isInstrumental(variants) {
    return variants.includes(2) || variants.includes(3) || variants.includes(6) || variants.includes(7)
}

function isDuet(variants) {
    return variants.includes(4) || variants.includes(5) || variants.includes(6) || variants.includes(7)
}

async function pageload() {
    tbody = document.getElementById('tbody')
    ponySongs = await (await fetch(`${JSON_PREFIX}/pony.json`)).json()
    nonPonySongs = await (await fetch(`${JSON_PREFIX}/nonpony.json`)).json()
    shimmerSongs = await (await fetch(`${JSON_PREFIX}/shimmer.json`)).json()

    // language, search, checkbox filters
    document.getElementById('language').onchange = () => applyFilters()
    const searchElem = document.getElementById('search')
    searchElem.oninput = (e) => updateSearch(e.target.value)
    clearSearch = document.getElementById('clearsearch')
    clearSearch.onclick = () => {
        searchElem.value = ''
        updateSearch(searchElem.value)
    }
    document.getElementById('instrumental').onchange = () => applyFilters()
    document.getElementById('duet').onchange = () => applyFilters()

    // categories
    const categories = Array.from(document.getElementById('category').getElementsByTagName('input'))
    categories.forEach((c) => {
        c.onchange = (e) => select(e.target.value)
    })
    // call select on whatever is currently selected
    const selected = categories.find((elem) => elem.checked).value
    select(selected)
}

function languageFilter(value) {
    switch (value) {
        case '': return () => true
        case 'English': case 'German': return (tr) => tr.dataset.language === value
        case 'Other': default: return (tr) => tr.dataset.language !== 'English' && tr.dataset.language !== 'German'
    }
}

// so we don't trigger with less than 4 characters
function updateSearch(rawValue) {
    const searchRaw = rawValue.toLowerCase()
    // enable/disable clearSearch button
    clearSearch.disabled = searchRaw.length === 0

    // maybe update filters
    const search = searchRaw.length < 4 ? '' : searchRaw
    if (search !== currentSearch) {
        currentSearch = search
        applyFilters()
    }
}

function applyFilters() {
    const language = document.getElementById('language').value
    const languageTrFilter = languageFilter(language)
    const instrumental = document.getElementById('instrumental').checked
    const duet = document.getElementById('duet').checked

    const trShouldShow = (tr) => (instrumental ? 'instrumental' in tr.dataset : true)
        && (duet ? 'duet' in tr.dataset : true)
        && languageTrFilter(tr)
        && (currentSearch === '' ? true : tr.dataset.search.includes(currentSearch))

    // filter
    for (const tr of tbody.getElementsByTagName('tr')) {
        const shouldShow = trShouldShow(tr)
        tr.hidden = !shouldShow
    }
}

function newTd() {
    return document.createElement('td')
}

function newTdWithValue(value) {
    const td = newTd()
    td.textContent = value
    return td
}

function newTdWithClassAndValue(className, value) {
    const td = newTdWithValue(value)
    td.className = className
    return td
}

function yearTd(year) {
    if (year === null || year > currentYear || year < currentYear - 97) {
        return newTd()
    }
    const yearString = year.toString()
    const td = newTdWithValue(yearString.substring(2))
    const span = document.createElement('span')
    span.className='century'
    span.textContent=yearString.substring(0,2)
    td.prepend(span)
    return td
}

function languageTd(language) {
    const td = newTd()
    td.className = 'language'
    if (language === 'English') {
        return td
    }
    // if it's not English (or not ONLY English) do something useful
    const span = document.createElement('span')
    span.title = language
    language.split(',').map(l => l.trim()).map(l => l.replace(' (romanized)', '')).forEach(l => {
        if (l in languageMapping) {
            const img = document.createElement('img')
            img.src = `language-icons/${languageMapping[l]}.svg`
            span.appendChild(img)
        } else {
            console.log(`unknown language: ${l}`)
            const innerSpan = document.createElement('span')
            innerSpan.textContent = '??'
            span.appendChild(innerSpan)
        }
    })
    td.appendChild(span)
    return td
}

function select(what) {
    const newChildren = []
    // build the new children
    let songs = []
    switch (what) {
        case 'pony': songs = ponySongs.songlist; break
        case 'non-pony': songs = nonPonySongs.songlist; break
        case 'shimmer': songs = shimmerSongs.songlist; break
    }
    // the songs are already sorted, we just need to add them
    for (const song of songs) {
        const tr = document.createElement('tr')
        tr.appendChild(newTdWithValue(song.artist))
        tr.dataset.search = `${song.artist} - ${song.title}`.toLowerCase()
        tr.dataset.language = song.language
        if (isInstrumental(song.variants)) {
            tr.dataset.instrumental = 'true'
        }
        if (isDuet(song.variants)) {
            tr.dataset.duet = 'true'
        }
        // TODO: fix language icons
        tr.appendChild(languageTd(song.language))
        tr.appendChild(newTdWithValue(song.title))
        tr.appendChild(yearTd(song.year))
        tr.appendChild(newTdWithClassAndValue('quality', song.variants.includes(0) || song.variants.includes(1) ? 'r' : ''))
        tr.appendChild(newTdWithClassAndValue('quality', song.variants.includes(2) || song.variants.includes(3) ? 'i' : ''))
        tr.appendChild(newTdWithClassAndValue('quality', song.variants.includes(4) || song.variants.includes(5) ? 'd' : ''))
        tr.appendChild(newTdWithClassAndValue('quality', song.variants.includes(6) || song.variants.includes(7) ? 'di' : ''))
        tr.appendChild(newTdWithClassAndValue('dmx', song.dmx === 0 ? '' : song.dmx === 1 ? '●' : song.dmx))

        newChildren.push(tr)
    }

    // finally replace nodes
    tbody.replaceChildren(...newChildren)
    // re-apply any filters
    applyFilters()
}
