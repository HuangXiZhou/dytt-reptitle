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

/**
 * 获取详情页链接
 *
 * @param {String} url
 * @param {Number} page
 * @param {Number} i
 */
const getTitleHref = (url, page, i, spinner, dataInclude, db) => {
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
        getTitleHref(BASE_URL, page, titleHrefCount ++, spinner, dataInclude, db)
      } else {
        spinner.stop().succeed(chalk.green('Successful access to details page url'))
        spinner = ora(chalk.yellow('Downloading BT...')).start()
        spinner.color = 'yellow'
        getBtLink(TITLE_HREF, btCount, spinner, dataInclude, db)
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
const getBtLink = (urls, n, spinner, dataInclude, db) => {
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
        getBtLink(urls, ++ btCount, spinner, dataInclude, db)
      } else {
        spinner.stop().succeed(chalk.green('Success'))
        saveData(MODEL, DB_BASE_URL, DB_NAME, db)
      }
    })
  })
}

/**
 * 数据存储
 *
 * @param {Object} obj
 */
const saveData = (obj, dbUrl, dbName, db) => {
  let collection = db.collection('bt')
  collection.removeMany((err, result) => {
    if(err) {
      console.log('')
      console.log(chalk.red('🖐  There is something wrong with delete before data...'))
      db.close()
    } else {
      collection.insertMany(obj, (err, result) => {
        if (err) {
          console.error(err)
        } else {
          console.log('')
          console.log(chalk.green('👌  Save the data successfully!'))
          db.close()
        }
      })
    }
  })
}

/**
 * 主函数
 *
 * @param {String} dbUrl
 * @param {String} dbName
 * @param {String} baseUrl
 * @param {Number} page
 * @param {Number} titleHrefCount
 * @param {Array} include
 */
const main = (config) => {
  mongoClient.connect(config.answers.dbUrl + config.answers.dbName, (err, db) => {
    if (err) {
      console.log(chalk.red('😩  Please start mongodb first'))
      console.log('--------------------------------')
      console.log(chalk.yellow('👀  Try to use:'))
      console.log('$ sudo mongod --config /usr/local/etc/mongod.conf')
      console.log(chalk.yellow('to start the mongodb'))
    } else {
      console.log(chalk.green('🎉  Connect to the database successfully!'))
      const spinner = ora()
      setTimeout(() => {
        spinner.text = chalk.yellow('Searching details page url...')
        spinner.color = 'yellow'
        spinner.start()
      }, 300)
      getTitleHref(config.baseUrl, config.answers.page, config.titleHrefCount, spinner, config.answers.include, db)
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
      let config = {
        answers: answers,
        baseUrl: BASE_URL,
        titleHrefCount: titleHrefCount,
      }
      main(config)
    })
  })
  .on('--help', () => {
    console.log('  Examples:')
    console.log('')
    console.log('$ reptitle run')
    console.log('$ reptitle r')
  })
program.parse(process.argv)
