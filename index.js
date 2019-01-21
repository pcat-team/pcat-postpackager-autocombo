
'use strict'

function createRequireConfig(ret, conf, settings, opt) {
    const DOMAIN = settings.domain || ''
    const USE_COMBO = settings.combo
    const COMBO_URL = settings.comboUrl || '/??'

    var _ = fis.util
    var idsObj = ret.ids
    var allModulePath = {}
    var modulePath = {}
    var allDeps = {}
    var allSyncDeps = {}
    var allAsyncDeps = {}
    var fileDeps = {}
    var allDepsFile = {}
    var comboUrl = {
        "scripts": {},
        "links": {}
    }

    var map = ret.map
    var res = map.res
    var pkg = map.pkg
    var pack = {}
    var loaded = {}
    var files = Object.keys(res)

    var requireJs = function(name) {
        var deps = allSyncDeps[name]
        var rz = getDeps(deps)
        return rz
    }
    var requireJsAsync = function(name) {
        var deps = allDeps[name]
        var rz = getDepsAsync(deps)
        return rz
    }
    var getDeps = function(rz) {
        var _rz = []
        if (!rz) return _rz;
        rz.forEach(function(_name) {
            if (allSyncDeps[_name]) _rz.push.apply(_rz, requireJs(_name))
        })
        rz.push.apply(rz, _rz)
        return rz
    }
    var getDepsAsync = function(rz) {
        var _rz = []
        if (!rz) return _rz;
        rz.forEach(function(_name) {
            if (allDeps[_name]) _rz.push.apply(_rz, requireJsAsync(_name))
        })
        rz.push.apply(rz, _rz)
        return rz
    }
    var getId = function(_file) {
        let file = res[_file];
         if(!file){
            fis.log.error("模块["+_file+"]不存在！")
        }
        return (file.extras && file.extras.moduleId) ? file.extras.moduleId : (idsObj[_file] ? (idsObj[_file].moduleId || _file) : _file)
    }
    var getUri = function(_file) {
        return (res[_file] ? res[_file].uri : '').replace(DOMAIN, '')
    }

    var checkAsync = function(_file) {
        return !!(res[_file] && res[_file].extras && res[_file].extras.async)
    }
    var getFileAsyncEnter = function(_file, rz) {
        if (!res[_file]) return rz;
        var goOn = []
        var deps = res[_file].deps
        checkAsync(_file) && rz.push.apply(rz, res[_file].extras.async)
        deps && deps.forEach(function(_file) {
            var file = res[_file]
            if (checkAsync(_file)) {
                rz.push.apply(rz, file.extras.async)
            } else {
                goOn.push(_file)
            }
        })
        deps !== void(0) && goOn.forEach(function(_file) {
            getFileAsyncEnter(_file, rz)
        })
        if (deps === void(0)) return rz;
    }
    // console.log(files,'files')
    files.forEach(function(_file, i) {
        let _allDeps = []
        if (res[_file].deps) {
            allSyncDeps[_file] = res[_file].deps;
            [].push.apply(_allDeps, res[_file].deps)
        }
        if (res[_file].extras && res[_file].extras.async) {
            [].push.apply(_allDeps, res[_file].extras.async)
        }
        allDeps[_file] = _allDeps
        allModulePath[_file] = getUri(_file)
    })
    files.forEach(function(_file) {
        let file = res[_file]
        let mId = getId(_file)
        let oneDeps = _.uniq(requireJs(_file))

        oneDeps.length > 0 && ! function() {
            let thisSyncDep = allDepsFile[_file] = []
            fileDeps[_file] = oneDeps.map(function(_file) {
                thisSyncDep.push(_file)
                return _file
            })
            let _copy = oneDeps.slice(0)
            _copy.reverse()

            _copy.map(function(__file) {
                let links = comboUrl.links[_file]
                let scripts = comboUrl.scripts[_file]
                let type = res[__file] ? res[__file].type : ''
                let cType = (res[__file] && res[__file].extras) ? res[__file].extras.comboTo : void 0
                let cOrder = (res[__file] && res[__file].extras) ? res[__file].extras.comboOrder : 1
                if (type === 'css') {
                    if (!links) {
                        comboUrl.links[_file] = [{
                            url: getUri(__file),
                            cType: cType,
                            cOrder: cOrder
                        }]
                    } else {
                        links.push({
                            url: getUri(__file),
                            cType: cType,
                            cOrder: cOrder
                        })
                    }
                } else if (type === 'js') {
                    if (!scripts) {
                        comboUrl.scripts[_file] = [{
                            url: getUri(__file),
                            cType: cType,
                            cOrder: cOrder
                        }]
                    } else {
                        scripts.push({
                            url: getUri(__file),
                            cType: cType,
                            cOrder: cOrder
                        })
                    }
                }
            })
        }()

        let fileAsync = []
        getFileAsyncEnter(_file, fileAsync)
        fileAsync = _.uniq(fileAsync)
        allAsyncDeps[_file] = fileAsync
    })


    _.forIn(allDepsFile, function(deps, _file) {
        modulePath[_file] = {}
        allDepsFile[_file] = _.uniq(deps).map(function(id) {
            modulePath[_file][id] = allModulePath[id]
            return id
        })
    })

    files.forEach(function(_file, i) {
        let file = idsObj[_file]

        if (file && (file._likes.isHtmlLike || file._likes.isJsLike)) {
            // console.log(fileDeps[_file],_file)
            let content = file.getContent()
            let depsAsync = allAsyncDeps[_file]
            depsAsync.forEach(function(_file) {;
                [].push.apply(depsAsync, requireJsAsync(_file))
            })
            depsAsync = _.uniq(depsAsync)
            let depsSync = fileDeps[_file]
            let trueAsyncDep = _.difference(depsAsync, depsSync)
            let thisPath = {}
            let thisDeps = {}
            // console.log(trueAsyncDep, _file, depsSync, modulePath[_file], comboUrl[_file])
            trueAsyncDep.forEach(function(_file) {
                let file = res[_file]
                let id = getId(_file)
                let type = file.type
                if(type === 'css'){
                  thisPath[_file] = allModulePath[_file]
                }else 
                if (type === 'js') {
                    thisPath[id] = allModulePath[_file]
                }
            })
            depsAsync.forEach(function(_file) {
                thisDeps[getId(_file)] = res[_file].deps ? res[_file].deps.map(function(_file) {
                    // return res[_file].type === 'js' ? getId(_file) : getUri(_file)
                    return getId(_file);
                }) : void(0)
            })
            let oConfig = {
                domain: DOMAIN,
                path: thisPath, //当前文件所有异步的且未被同步combo的模块路径
                deps: thisDeps, //当前文件第一层异步节点的所有依赖，包含同步和异步的
                combo: USE_COMBO,
                comboUrl: COMBO_URL //当前文件所有同步combo的url
            }
            let config = JSON.stringify(oConfig, null, '\t')


            let _comboJS = comboUrl.scripts[_file] || []
            let _comboCSS = comboUrl.links[_file] || []

            let comboJS = {}
            let comboCSS = {}

            let comboJSRz = []
            let comboCSSRz = []
            let unComboJSRzTop = []
            let unComboCSSRzTop = []
            let unComboJSRzLaster = []
            let unComboCSSRzLaster = []

            _comboJS.forEach(function(obj) {
                let type = obj.cType || -99
                comboJS[type] ? comboJS[type].push(obj) : comboJS[type] = [obj]
            })
            _comboCSS.forEach(function(obj) {
                let type = obj.cType || -99
                comboCSS[type] ? comboCSS[type].push(obj) : comboCSS[type] = [obj]
            })
            Object.keys(comboJS).map(function(type) {
                return +type
            }).sort().forEach(function(type) {
                let thisComboJS = comboJS['' + type]
                // thisComboJS.reverse()

                if (type <= 99 && type >= 0 && oConfig.combo) {
                    let urls = thisComboJS.sort(function(a, b) {
                        return a.cOrder - b.cOrder
                    }).map(function(obj) {
                        return obj.url.replace(DOMAIN, '')
                    })
                    comboJSRz.push('<script class=" defer" src="' + DOMAIN + COMBO_URL + urls.join(',') + '"></script>')
                    // ;[].push.apply(comboJSRz,thisComboJS.map(function(url){return url.replace(DOMAIN , '')}))
                } else if (type < 0) {
                    unComboJSRzTop.push(thisComboJS.map(function(obj) {
                        return '<script class=" defer" src="' + DOMAIN + obj.url + '"></script>'
                    }).join('\n'))
                } else {
                    unComboJSRzLaster.push(thisComboJS.map(function(obj) {
                        return '<script class=" defer" src="' + DOMAIN + obj.url + '"></script>'
                    }).join('\n'))
                }
            })

            Object.keys(comboCSS).map(function(type) {
                return +type
            }).sort().forEach(function(type) {
                let thisComboCSS = comboCSS['' + type]
                // thisComboCSS.reverse()
                if (type <= 99 && type >= 0 && oConfig.combo) {
                    let urls = thisComboCSS.sort(function(a, b) {
                        return a.cOrder - b.cOrder
                    }).map(function(obj) {
                        return obj.url.replace(DOMAIN, '')
                    })
                    comboCSSRz.push('<link href="' + DOMAIN + COMBO_URL + urls.join(',') + '" type="text/css" rel="stylesheet" />')
                    // ;[].push.apply(comboCSSRz,thisComboCSS.map(function(url){return url.replace(DOMAIN , '')}))
                } else if (type < 0) {
                    unComboCSSRzTop.push(thisComboCSS.map(function(obj) {
                        return '<link href="' + DOMAIN + obj.url + '" type="text/css" rel="stylesheet" />'
                    }).join('\n'))
                } else {
                    unComboCSSRzLaster.push(thisComboCSS.map(function(obj) {
                        return '<link href="' + DOMAIN + obj.url + '" type="text/css" rel="stylesheet" />'
                    }).join('\n'))
                }
            })
            // Object.keys(comboJS).map(function(type){
            //   return +type
            // }).sort().forEach(function(type){
            //   let thisComboJS = comboJS[''+type]
            //   // thisComboJS.reverse()
            //   console.log(type)
            //   if(type <=99 && type >=0 && oConfig.combo ){
            //     ;[].push.apply(comboJSRz,thisComboJS.map(function(url){return url.replace(DOMAIN , '')}))
            //   }else if(type < 0){
            //     unComboJSRzTop.push(thisComboJS.map(function(url) {
            //         return '<script class=" defer" src="'+ DOMAIN + url + '"></script>'
            //      }).join('\n'))
            //   }else{
            //     unComboJSRzLaster.push(thisComboJS.map(function(url) {
            //         return '<script class=" defer" src="' + DOMAIN + url + '"></script>'
            //      }).join('\n'))
            //   }
            // })
            // Object.keys(comboCSS).map(function(type){
            //   return +type
            // }).sort().forEach(function(type){
            //   let thisComboCSS = comboCSS[''+type]
            //   // thisComboCSS.reverse()
            //   if(type <=99 && type >=0 && oConfig.combo ){
            //     ;[].push.apply(comboCSSRz,thisComboCSS.map(function(url){return url.replace(DOMAIN , '')}))
            //   }else if(type < 0){
            //     unComboCSSRzTop.push(thisComboCSS.map(function(url) {
            //         return '<link type="text/css" rel="stylesheet" href="' + DOMAIN + url + '" />'
            //      }).join('\n'))
            //   }else if(type > 99){
            //     unComboCSSRzLaster.push(thisComboCSS.map(function(url) {
            //         return '<link type="text/css" rel="stylesheet" href="' + DOMAIN + url + '" />'
            //      }).join('\n'))
            //   }
            // })
            // Object.keys(comboCSS).map(function(type){
            //   return +type
            // }).sort().forEach(function(type){
            //   let thisComboCSS = comboCSS[''+type]
            //   // thisComboCSS.reverse()
            //   let css = (type >=0 && oConfig.combo) ? '<link type="text/css" rel="stylesheet" data-order="'+type+'" href="' + oConfig.domain + oConfig.comboUrl + thisComboCSS.map(function(url){return url.replace(DOMAIN , '')}).join(',') + '"></link>' 
            //     : (thisComboCSS.map(function(url) {
            //         return '<link type="text/css" rel="stylesheet" href="' + url + '"></link>'
            //      })).join('\n')
            //   comboCSSRz.push(css)
            // })
            // console.log(comboJSRz,comboCSSRz)
            // console.log(oConfig.combo)
            // let comboScripts = comboJS ? (oConfig.combo ? '<script class=" defer" src="' + oConfig.domain + oConfig.comboUrl + comboJS.map(function(url){return url.replace(DOMAIN , '')}).join(',') + '"></script>' : (comboJS.map(function(url) {
            //                                 return '<script class=" defer" src="' + url + '"></script>'
            //                              })).join('\n')) : '';
            // let comboLinks = comboCSS ? (oConfig.combo ? '<link href="' + oConfig.domain + oConfig.comboUrl + comboCSS.map(function(url){return url.replace(DOMAIN , '')}).join(',') + '" />' : (comboCSS.map(function(url) {
            //                               return '<link href="' + url + '"/>'
            //                            })).join('\n')) : '';
            // console.log(comboLinks,comboCSS,_file)
            //       console.log(_file,'=============',comboJSRz,'\n'
            // ,unComboJSRzTop,'\n'
            // ,unComboJSRzLaster)
            file.setContent(content.replace(/<!--REQUIRE_CONFIG-->|__REQUIRE_CONFIG__|window\.__REQUIRE_CONFIG__/g, config)
                .replace('<!--COMBO_JS-->', unComboJSRzTop.join('\n') + (comboJSRz.length > 0 ? comboJSRz.join('\n') : '') + unComboJSRzLaster.join('\n'))
                .replace('<!--COMBO_CSS-->', unComboCSSRzTop.join('\n') + (comboCSSRz.length > 0 ? comboCSSRz.join('\n') : '') + unComboCSSRzLaster.join('\n')))
        }

    })
}
module.exports = createRequireConfig 