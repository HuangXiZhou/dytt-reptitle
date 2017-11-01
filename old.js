const cheerio = require('cheerio')
const http = require('http')
const iconv = require('iconv-lite')
const mongo_url = 'mongodb://localhost:27017/trevor-mongo'

let index = 1
let count = 0
let url = 'http://www.ygdy8.net/html/gndy/dyzz/list_23_'
let urls = []
let btLink = []

const getTitle = (url, i) => {
  console.log("正在获取第" + i + "页的内容")
  http.get(url + i + '.html', function(sres) {
    let chunks = []
    sres.on('data', function(chunk) {
      chunks.push(chunk)
    })
    sres.on('end', function() {
      let html = iconv.decode(Buffer.concat(chunks), 'gb2312')
      let $ = cheerio.load(html, {decodeEntities: false})
      $('.co_content8 .ulink').each(function (idx, element) {
        let $element = $(element)
        urls.push({
          title: $element.attr('href')
        })
      })  
      if(i < 3) {
        getTitle(url, ++index)
      } else {
        console.log("Title获取完毕！")
        getBtLink(urls, count)    
      }
    })
  })
}

const getBtLink = (urls, n) => {
  console.log("正在获取第" + n + "个url的内容")
  http.get('http://www.ygdy8.net' + urls[n].title, function(sres) {
    let chunks = []
    sres.on('data', chunk => {
      chunks.push(chunk)
    })
    sres.on('end', () => {
      let html = iconv.decode(Buffer.concat(chunks), 'gb2312')
      let $ = cheerio.load(html, {decodeEntities: false})
      $('#Zoom td').children('a').each(function (idx, element) {
        let $element = $(element)
        btLink.push({
          bt: $element.attr('href')
        })
      })
      if(n < urls.length - 1) {
        getBtLink(urls, ++count)
      } else {
        console.log("bt获取完毕！")
        console.log(btLink)
        save() 
      }
    })
  })
}

const save = () => {
  let MongoClient = require('mongodb').MongoClient
  MongoClient.connect(mongo_url, (err, db) => {
    if (err) {
      console.error(err)
      return
    } else {
      console.log("成功连接数据库")
      let collection = db.collection('node-reptitle')
      collection.insertMany(btLink, function (err,result) {
        if (err) {
          console.error(err)
        } else {
          console.log("保存数据成功")
        }
      })
      db.close()
    }
  })
}

const main = () => {
  console.log("开始爬取")
  getTitle(url, index)
}

main()
