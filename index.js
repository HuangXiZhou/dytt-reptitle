#! /usr/bin/env node

const program     = require('commander')
const chalk       = require('chalk')
const http        = require('http')
const cheerio     = require('cheerio')
const _           = require('lodash')
const iconv       = require('iconv-lite')
const inquirer    = require('inquirer')
const ora         = require('ora')
const mongoClient = require('mongodb').MongoClient

const BASE_URL    = 'http://www.ygdy8.net/html/gndy/dyzz/list_23_'

let TITLE_HREF = []
let MODEL = []

let titleHrefCount = 1
let btCount = 0

let DB_BASE_URL = ''
let DB_NAME = ''

let connectTest = true

/**
 * 测试数据库连接
 *
 * @param {String} dbUrl
 * @param {String} dbName
 */
const testConnectDb = (dbUrl, dbName) => {
  mongoClient.connect(dbUrl + dbName, (err, db) => {
    if (err) {
      console.log(chalk.red('Please start mongodb first'))
      connectTest = false
      return
    } else {
      console.log(chalk.green('Connect to the database successfully!'))
      db.close()
    }
  })
}

/**
 * 获取详情页链接
 *
 * @param {String} url
 * @param {Number} page
 * @param {Number} i
 */
const getTitleHref = (url, page, i, spinner, dataInclude) => {
  http.get(url + i + '.html', sres => {
    let chunks = []
    sres.on('data', chunk => {
      chunks.push(chunk)
    })
    sres.on('end', chunk => {
      let html = iconv.decode(Buffer.concat(chunks), 'gb2312')
      let $ = cheerio.load(html, { decodeEntities: false })
      $('.co_content8 .ulink').each((idx, element) => {
        let $element = $(element)
        TITLE_HREF.push({
          titleHref: $element.attr('href')
        })
      })
      if(i < page) {
        getTitleHref(BASE_URL, page, titleHrefCount ++, spinner, dataInclude)
      } else {
        spinner.stop().succeed(chalk.green('Successful access to details page url'))
        spinner = ora(chalk.yellow('Downloading BT...')).start()
        spinner.color = 'yellow'
        getBtLink(TITLE_HREF, btCount, spinner, dataInclude)
      }
    })
  })
}

/**
 * 获取BT种子
 *
 * @param {Arrary} urls
 * @param {Number} n
 * @param {Function} spinner
 */
const getBtLink = (urls, n, spinner, dataInclude) => {
  http.get('http://www.ygdy8.net' + urls[n].titleHref, sres => {
    let chunks = []
    sres.on('data', chunk => {
      chunks.push(chunk)
    })
    sres.on('end', () => {
      let html = iconv.decode(Buffer.concat(chunks), 'gb2312')
      let $ = cheerio.load(html, { decodeEntities: false })
      let title = ''
      let time = ''
      let imgUrl = ''
      let bt = ''
      dataInclude.forEach(item => {
        if(item === 'title') {
          $('.title_all h1 font').each((idx, element) => {
            let $element = $(element)
            title = $element.text()
          })
        }

        if(item === 'time') {
          $('.co_content8 ul').each((idx, element) => {
            let $element = $(element)
            time = $element.text().slice(10, 20)
          })
        }

        if(item === 'imgUrl') {
          $('#Zoom span img').eq(0).each((idx, element) => {
            let $element = $(element)
            imgUrl = $element.attr('src')
          })
        }
      }, this)

      $('#Zoom td').children('a').each((idx, element) => {
        let $element = $(element)
        bt = $element.attr('href')
      })

      switch (dataInclude.length) {
        case 3: {
          MODEL.push({
            TITLE: title,
            UPLOADTIME: time,
            POSTER: imgUrl,
            BT: bt
          })
          break
        }

        case 2: {
          if(!title) {
            MODEL.push({
              UPLOADTIME: time,
              POSTER: imgUrl,
              BT: bt
            })
          }
          if(!time) {
            MODEL.push({
              TITLE: title,
              POSTER: imgUrl,
              BT: bt
            })
          }
          if(!imgUrl) {
            MODEL.push({
              TITLE: title,
              UPLOADTIME: time,
              BT: bt
            })
          }
          break
        }

        case 1: {
          if(title) {
            MODEL.push({
              TITLE: title,
              BT: bt
            })
            break
          }
          if(time) {
            MODEL.push({
              UPLOADTIME: time,
              BT: bt
            })
            break
          }
          if(imgUrl) {
            MODEL.push({
              POSTER: imgUrl,
              BT: bt
            })
            break
          }
          break
        }

        default: {
          MODEL.push({
            BT: bt
          })
          break
        }
      }

      if(n < urls.length - 1) {
        getBtLink(urls, ++ btCount, spinner, dataInclude)
      } else {
        spinner.stop().succeed(chalk.green('Success'))
        saveData(MODEL, DB_BASE_URL, DB_NAME)
      }
    })
  })
}

/**
 * 数据存储
 * @param {Object} obj
 */
const saveData = (obj, dbUrl, dbName) => {
  mongoClient.connect(dbUrl + dbName, (err, db) => {
    if(err) {
      console.error(err)
      return
    } else {
      let collection = db.collection('bt')
      collection.insertMany(obj, (err,result) => {
        if (err) {
          console.error(err)
        } else {
          console.log(chalk.green('Save the data successfully!'))
        }
      })
      db.close()
    }
  })
}

/**
 * 交互式命令
 */
program
  .command('run')
  .alias('r')
  .description(chalk.green('Crawl the www.dytt8.net\'s history BT'))
  .action(option => {
    let config =  _.assign({
      dbUrl: '',
      dbName: '',
      collectionName: '',
      page: 1,
      title: false,
      time: false,
      imgUrl: false
    }, option)

    let promps = []

    if(config.dbUrl !== 'string') {
      promps.push({
        type: 'input',
        name: 'dbUrl',
        message: chalk.cyan('DBUrl:'),
        default: 'mongodb://localhost:27017/'
      })
    }

    if(config.dbName !== 'string') {
      promps.push({
        type: 'input',
        name: 'dbName',
        message: chalk.cyan('DBName:'),
        default: 'dytt-reptitle'
      })
    }

    if(config.collectionName !== 'string') {
      promps.push({
        type: 'input',
        name: 'collectionName',
        message: chalk.cyan('CollectionName:'),
        default: 'bt'
      })
    }

    if(config.page !== 'number') {
      promps.push({
        type: 'input',
        name: 'page',
        message: chalk.cyan('How many page you want to Crawl:'),
        default: 1
      })
    }

    if(config.title === false && config.time === false && config.imgUrl === false) {
      promps.push({
        type: 'checkbox',
        name: 'include',
        message: chalk.cyan('Data include:'),
        choices: [
          {
            name: 'Movie title',
            checked: true,
            value: 'title'
          }, {
            name: 'Upload time',
            checked: true,
            value: 'time'
          }, {
            name: 'Movie poster',
            checked: true,
            value: 'imgUrl'
          }
        ]
      })
    }

    inquirer.prompt(promps).then(answers => {
      DB_BASE_URL = answers.dbUrl
      DB_NAME = answers.dbName
      testConnectDb(DB_BASE_URL, DB_NAME)
      if(connectTest) {
        const spinner = ora()
        setTimeout(() => {
          spinner.text = chalk.yellow('Searching details page url...')
          spinner.color = 'yellow'
          spinner.start()
        }, 300)
        getTitleHref(BASE_URL, answers.page, titleHrefCount, spinner, answers.include)
      } else {
        console.log(chalk.red('Please start mongodb first'))
      }
    })
  })
  .on('--help', () => {
    console.log('  Examples:')
    console.log('')
    console.log('$ reptitle run')
    console.log('$ reptitle r')
  })
program.parse(process.argv)
