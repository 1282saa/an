//관계도 색깔표 같이 사용(chart-setting.js)
var chartColorMap = {
	"PERSON": $('.rel-control-info .item01.active').css( "background-color" ),
	"LOCATION": $('.rel-control-info .item02.active').css( "background-color" ),
	"ORGNIZATION": $('.rel-control-info .item03.active').css( "background-color" ),
	"KEYWORD": $('.rel-control-info .item04.active').css( "background-color" ),
	"NEWS":"#337ab7",
	"COMPANY":"#1565C0",
	"PRODUCT":"#D9534F"
};

var AnalysisRelationshipsColorMap = chartColorMap;

var currWeight = ""; //관계도 조회 가중치값 임시 저장

var AnalysisRelationships = function( chart,keyword,startDate,endDate) {
    
    var params = {
        	    		  pageInfo: 'newsResult',
        	    		  login_chk: '',
        	    		  LOGIN_SN: '',
        	    		  LOGIN_NAME: '',
        	    		  indexName: 'news',
        	    		  editorialIs: false,
        	    		  keyword:keyword,
        	    		  byLine: '',
        	    		  searchScope: 1,
        	    		  searchFtr: 1,
        	    		  startDate: startDate,
        	    		  endDate:endDate,
        	    		  sortMethod: 'date',
        	    		  contentLength: 100,
        	    		  providerCode: '',
        	    		  categoryCode: '',
        	    		  incidentCode: '',
        	    		  dateCode: '',
        	    		  highlighting: true,
        	    		  sessionUSID: '',
        	    		  sessionUUID: 'test',
        	    		  listMode: '',
        	    		  categoryTab: '',
        	    		  newsId: '',
        	    		  delnewsId: '',
        	    		  delquotationId: '',
        	    		  delquotationtxt: '',
        	    		  filterProviderCode: '',
        	    		  filterCategoryCode: '',
        	    		  filterIncidentCode: '',
        	    		  filterDateCode: '',
        	    		  filterAnalysisCode: '',
        	    		  startNo: 1,
        	    		  resultNumber: 10,
        	    		  topmenuoff: '',
        	    		  resultState: 'detailSearch',
        	    		  keywordJson: '',
        	    		  keywordFilterJson: '',
        	    		  realKeyword: '',
        	    		  keywordYn: 'Y',
        	    		  totalCount: 5,
        	    		  interval: 1,
        	    		  quotationKeyword1: '',
        	    		  quotationKeyword2: '',
        	    		  quotationKeyword3: '',
        	    		  printingPage: '',
        	    		  searchFromUseYN: 'N',
        	    		  searchFormName: '',
        	    		  searchFormSaveSn: '',
        	    		  mainTodayPersonYn: '',
        	    		  period: '3month',
        	    		  sectionDiv: 1000,
        	    		  maxNewsCount: 1000,
        	    		  networkNodeType: '',
        	    		  resultNo: 100,
        	    		  isTmUsable: false,
        	    		  isNotTmUsable: false,
        	    		  normalization: '10'
        	    		};
    this.resultParams = params;
    this.nodeDelimiter = "--";

    this.chart = chart;
    this.viewMode = "network";
    this.$loader = $(".loading");
    this.zoomValue = 0.8;
    this.minRelatedNewsCount = 30;
    this.relatedRate = 100;
    this.normalization = 10; // 2020-11-30, 관계도분속 노드/링크 크기 정규화

    this.originNodes = [];
    this.originLinks = [];
    this.originNeedges = [];
    this.originProvider2node = [];

    this.typeLength = $(".btn-node-type").length;
    this.setSelectedTypes();

    this.graphType = "normal";
    this.nodes = [];
    this.links = [];
    this.needges = [];
    this.detailCategories = ["PERSON", "ORGNIZATION", "LOCATION"];

    this.$keyword = $("#analysis-keyword");

    this.relativeNewsTemplate = Handlebars.getTemplate("analysis/news-list");
    this.$relativeNewsWrap = $("#relative-news-wrap");

 	this.zoomSlider = $("#zoom-rate").slider({
    	orientation: "vertical",
    	min: 1,
    	max: 300,
    	step: 1,
        slide: function(event,ui){
        	chart.zoom(ui.value / 100, false);
        },
        change: function(event,ui){
        	chart.zoom(ui.value / 100, false);
        }
    });


	
	/*this.zoomSlider = $("#zoom-rate").slider({
        value: 80,
        create: function( event, ui ) {
			chart.zoom(ui.value / 100, false);
            $("#analysis-zoom-rate").text(ui.value);
		}
    });*/




    this.nodeDetailTemplate = Handlebars.getTemplate("analysis/node-detail");
    this.$nodeDetailWrap = $("#node-detail-wrap");

    //this.$loader = $(".viz-network > .analysis-viz-loader");

    this.getNetworkData();
    this.initEvent();
}

AnalysisRelationships.prototype.updateResultData = function() {
    var self = this;
    var resultParams = self.newsResult.getNetworkParams();

    if (JSON.stringify(this.resultParams) !== JSON.stringify(resultParams)) {
        this.resultParams = resultParams;
        this.getNetworkData();
    }
}

AnalysisRelationships.prototype.calcRelationship = function(a, min) {
    var fn = function(n, src, got, all) {
        if (n == 0) {
            if (got.length > 0) {
                all[all.length] = got;
            }
            return;
        }
        for (var j = 0; j < src.length; j++) {
            fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
        }
        return;
    }
    var all = [];

    fn(2, a, [], all);

    all.push(a);

    return all;
}

AnalysisRelationships.prototype.getCombination = function(array) {
    var results = [];

    // Since you only want pairs, there's no reason
    // to iterate over the last element directly
    for (var i = 0; i < array.length - 1; i++) {
        // This is where you'll capture that last value
        for (var j = i + 1; j < array.length; j++) {
            results.push([array[i], array[j]]);
            //results.push(array[i] + ' ' + array[j]);
        }
    }

    return results;
}

AnalysisRelationships.prototype.replaceChartData = function() {
    var self = this;

    //self.$loader.show();
    self.$loader.show();
		

    var slicedEntities = _.filter(self.entityNodes, function(node) {
        return node.weight >= self.minRelatedNewsCount;
    });

    if (self.selectedTypes.length < self.typeLength) {
        slicedEntities = _.filter(slicedEntities, function(entity) {
            var type = entity.category.toLowerCase();
            return type == "root" || self.selectedTypes.indexOf(type) >= 0;
        });
    }

    var links = [];
    var tempLinks = [];

    if (self.graphType == "normal") {
        _.forEach(slicedEntities, function (entityNode) {
            links.push({
                from: "ROOT",
                to: entityNode.id,
                weight: entityNode.node_size
            });

            var tempLink = _.filter(self.originLinks, function(l) {
                return l.to === entityNode.id;
            });

            if (tempLink) {
                tempLinks = tempLinks.concat(tempLink);
            }
        });

        var groupedLinks = _.groupBy(tempLinks, 'from');
        var linkCntMap = {};
        _.forEach(groupedLinks, function(gLink) {
            if (gLink.length > 1) {
                var toLinks = [];
                _.forEach(gLink, function(linkItem) {
                    toLinks.push(linkItem.to);
                });

                _.forEach(self.getCombination(toLinks), function(combinationLink) {
                    var linkCntKey = combinationLink[0] + self.nodeDelimiter + combinationLink[1];
                    if (!linkCntMap[linkCntKey]) {
                        linkCntMap[linkCntKey] = 0;
                    }
                    linkCntMap[linkCntKey]++;
                });
            }
        });

        _.forEach(linkCntMap, function(cnt, key) {
            if (cnt >= self.minRelatedNewsCount) {
                var link = key.split(self.nodeDelimiter);
                var linkWeight;
                _.forEach(self.originNeedges, function(oneNeedges) {
                	if((oneNeedges.from == link[0] && oneNeedges.to == link[1])
                			|| (oneNeedges.to == link[0] && oneNeedges.from == link[1])) {
                		linkWeight = oneNeedges.weight;
                	}
                });
                links.push({
                    from: link[0],
                    to: link[1],
                    weight: linkWeight
                });
            }
        });
    } else if (self.graphType == "provider_name") {
        var entityIds = _.map(slicedEntities, "id");
        var relatedLinks = _.filter(self.originLinks, function(oLink) {
            return entityIds.indexOf(oLink.to) > -1;
        });

        var relatedNewsIds = _.map(relatedLinks, "from");
        var relatedNews = _.filter(self.newsList, function(newsItem) {
            return relatedNewsIds.indexOf(newsItem.news_id) > -1;
        });

        // Uniq 한 매체를 추출하고 이에 대한 정보를 Node로 추가
        var providerNames = _.uniq(_.map(relatedNews, "provider_name"));

        _.forEach(providerNames, function(providerName, idx) {
            slicedEntities.push({
                id: providerName,
                title: providerName,
                weight: 10,
                node_size: 6.32,
                category: "provider"
            });

            links.push({
                from: "ROOT",
                to: providerName,
                weight: self.normalization
            });
        });

        _.forEach(relatedLinks, function(relLink) {
        	var linkWeight;
            var news = _.find(self.newsList, function(newsItem) {
                return relLink.from == newsItem.news_id;
            });

            if (news) {
            	var key = news.provider_name + self.nodeDelimiter + relLink.to;
            	var linkWeight = self.originProvider2node[key]; 
                links.push({
                    from: news.provider_name,
                    to: relLink.to,
                    weight: linkWeight
                });
            }
        });
    }

    links = _.uniqWith(links, _.isEqual);
    
    //from, to 값이 같아 하나의 노드로 연결되는 링크 제거하도록 필터링
    links = _.filter(links, function(l) {
        return l.from != l.to;
    });
    
    self.renderedData = {
        nodes: slicedEntities, links: links
    };

    self.chart.reloadData();
    self.chart.replaceData(self.renderedData);
    var countedNodes = _.countBy(slicedEntities, "category");
	$(`#relative-person-cnt[data-seq='${chartSeq}']`).text(countedNodes["PERSON"] || 0);
	$(`#relative-location-cnt[data-seq='${chartSeq}']`).text(countedNodes["LOCATION"] || 0);
	
	$(`#relative-org-cnt`).text(countedNodes["ORGNIZATION"] || 0);
	$(`#relative-keyword-cnt[data-seq='${chartSeq}']`).text(countedNodes["KEYWORD"] || 0);
	
	self.initChartSetting();
	
}

AnalysisRelationships.prototype.initChartSetting = function() {
    var self = this;

    setTimeout(function() {
        var setting = self.getChartArea();
        setting.events = {
            onClick: function(event) {
                if (event.clickNode) {
					//window.open("/v2/news/search.do?k="+keyword, "_blank");
					window.open("/v2/news/search.do?k="+keyword , '빅카인즈', 'width=1650px,height=800px,scrollbars=yes');
                    var node = event.clickNode;
                    self.chart.clearFocus();
                    self.chart.addFocusNode(node.id);


                    var relatedLinks = _.filter(self.originLinks, function(oLink) {
                        return node.id == oLink.to;
                    });
                    var relatedNewsIds = _.map(relatedLinks, "from");

                    //$(".analysis-network-news").removeClass("related");
                    var types = ["item-people", "item-place", "item-insti", "item-keword"];
                    $(".analysis-network-news").removeClass(types.join(" "));

                    var $container = $("#relative-news-wrap");
                    var $scrollTo = null;
                    var minTop = 99999;

                    _.forEach(relatedNewsIds, function(newsId) {
                    	self.updateNewsList(newsId);
                    	self.renderRelativeNews();
                    });
                    _.forEach(relatedNewsIds, function(newsId) {
                        var $tmp = $(".analysis-network-news[data-id='" + newsId + "']");
                        if ($tmp.length) {
                            if ($tmp.offset().top < minTop) {
                                minTop = $tmp.offset().top;
                                $scrollTo = $tmp;
                            }
							
							//var types = ["PERSON", "LOCATION", "ORGNIZATION", "KEYWORD"];
							

                            //$(".analysis-network-news[data-id='" + newsId + "']").addClass("related");
                            //$(".analysis-network-news[data-id='" + newsId + "'] .related-icon").addClass(node.data.category);
							
							var activeClass;
							if(node.data.category == 'PERSON'){
								activeClass = 'item-people';
							}else if(node.data.category == 'LOCATION'){
								activeClass = 'item-place';
							}else if(node.data.category == 'ORGNIZATION'){
								activeClass = 'item-insti';
							}else if(node.data.category == 'KEYWORD'){
								activeClass = 'item-keword';
							}
							
							$(".analysis-network-news[data-id='" + newsId + "']").addClass(activeClass);
							
                        }
                    });
                    if ($scrollTo) {
                        $container.animate({scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop(), scrollLeft: 0},300);
                    }
                }
            },
            onRightClick: function(event) {
                if (event.clickNode){
                    if (confirm("선택한 노드를 삭제하시겠습니까?")) {
                        if (event.clickNode.id === "ROOT") {
                            if (confirm("선택하신 노드는 ROOT(중앙)노드 입니다. 정말 삭제하시겠습니까?")) {
                                event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                            }
                        } else {
                            event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                        }
                    }

                }
            }
        }

        self.chart.updateSettings(setting);
        self.chart.resetLayout();
        self.$loader.hide();
        $('#zoom-rate').slider('value', 80);

		setTimeout(function() {
			$(".network-relayout-btn").trigger('click');
		}, 10);

    }, 700);
}


function reArrangeNewsList(array, from, to) {
	var element = array[from];
	array.splice(from, 1);
	array.splice(to, 0, element);
}

AnalysisRelationships.prototype.updateNewsList = function(newsId){
	var self = this;
	var newsListIds = _.map(self.newsList, "news_node_id"); 
    var idx = newsListIds.indexOf(newsId.replace(".","-"));
    if(idx > -1) reArrangeNewsList(self.newsList,idx,0)
}


AnalysisRelationships.prototype.getChartArea = function() {
    var self = this;
    var networkWidth = $(".viz-network-graph-wrap").width();
    var sidebarWidth = $(".viz-network-graph-wrap .sidebar").width();
    var doubleSidebarWidth = 398; // $(".viz-network-graph-wrap .sidebar.double").width();

    if (sidebarWidth > 0) {
        switch (self.viewMode) {
            case "kb-network":
                networkWidth = networkWidth - sidebarWidth;
                break;
            case "network-news":
                networkWidth = networkWidth - doubleSidebarWidth;
                break;
            case "kb-network-news":
                networkWidth = networkWidth - (sidebarWidth * 2);
                break;
        }
    }

    var areaSetting = {
        area: {
            width: networkWidth
        }
    };

    if (isMobileSize()) {
        areaSetting.area.height = 420;
    }

    return areaSetting;
}

AnalysisRelationships.prototype.removeNode = function(event, self) {
    if (event.clickNode) {
        if (confirm("선택한 노드를 삭제하시겠습니까?")) {
            if (event.clickNode.id == "ROOT") {
                if (confirm("그래프의 중심이 되는 노드를 선택하셨습니다. 정말 삭제하시겠습니까?")) {
                    event.chart.removeData({nodes:[{id:event.clickNode.id}]});
                }
            } else {
                event.chart.removeData({nodes:[{id:event.clickNode.id}]});
            }
        }
    }
}

AnalysisRelationships.prototype.getNetworkData = function() {
	//chartSeq = $(this).closest('.keyword-chat').data('seq');

    var self = this;

    if (self.resultParams) {
        //self.$loader.show();
		
    	self.$loader.show();

        self.resultParams.maxNewsCount = 1000;
        self.resultParams.sectionDiv = 1000;
        self.resultParams.endDate = moment(self.resultParams.endDate).add(1, 'days').format("YYYY-MM-DD");
        self.resultParams.resultNo = 100;
        self.resultParams.isTmUsable = $("#filter-tm-use").is(":checked");
        self.resultParams.isNotTmUsable = $("#filter-not-tm-use").is(":checked");

        var _type = "";
        if(self.resultParams.indexName == "editorial"){
        	_type = "-editorial";
        }

        var searchFilterType = $("#search-filter-type"+_type+" option:selected").val();
        var searchScopeType = $("#search-scope-type"+_type+" option:selected").val();

        if(searchFilterType != "" && searchFilterType != null){
        	self.resultParams.searchFtr = $("#search-filter-type"+_type+" option:selected").val();
        }
        if(searchScopeType != "" && searchScopeType != null){
        	self.resultParams.searchScope = $("#search-scope-type"+_type+" option:selected").val();
        }
        //
        if (self.resultParams.providerCode
            || self.resultParams.categoryCode
            || self.resultParams.incidentCode
            || self.resultParams.dateCode) {

            var filterProviderCodes = [];
            var filterCategoryCodes = [];
            var filterIncidentCodes = [];

            var splitProviderCodes = self.resultParams.providerCode.split(",");
            for (var i = 0; i < splitProviderCodes.length; i++) {
                filterProviderCodes.push("reprov_" + splitProviderCodes[i].trim());
            }

            var splitCategoryCodes = self.resultParams.categoryCode.split(",");
            for (var i = 0; i < splitCategoryCodes.length; i++) {
                filterCategoryCodes.push("recate_" + splitCategoryCodes[i].trim());
            }

            var splitIncidentCodes = self.resultParams.incidentCode.split(",");
            for (var i = 0; i < splitIncidentCodes.length; i++) {
                filterIncidentCodes.push(splitIncidentCodes[i].trim());
            }

            var paramData = {
                filterProviderCode: filterProviderCodes.join(","),
                filterCategoryCode:  filterCategoryCodes.join(","),
                filterIncidentCategoryCode:  filterIncidentCodes.join(","),
                filterDateCode: self.resultParams.dateCode,
                filterAnalysisCode: ""
            };

            self.resultParams.keywordFilterJson = JSON.stringify(paramData);
        } else {
            self.resultParams.keywordFilterJson = null;
        }
        

        self.resultParams.normalization = self.normalization;

        $.ajax({
    		url: _contextPath + "/news/getNetworkDataAnalysis.do",
    		method: "POST",
    		dataType: "JSON",
    		data: $.param(self.resultParams),
    		success: function(result) {
    			var maxWeight = 0;
    			$(".analysis-network__filter-box").show();
    			if (result && result.nodes && result.links) {
    				_.forEach(result.nodes, function(node) {
    					maxWeight = Math.max(maxWeight, node.weight);

    					if (node.id == "ROOT") {
    						self.rootNode = node;
    						node.title = self.resultParams.keyword;
    						node.label_ne = self.resultParams.keyword;
    						node.weight = 100;
    						node.node_size = self.normalization;
    					}

    					delete node["style"];
    				});

    				self.minRelatedNewsCount = parseInt(maxWeight * 0.1) + 1;

    				self.originLinks = result.links;
    				self.originNodes = result.nodes;
    				self.originNeedges = result.needges;
    				self.originProvider2node = result.provider2node;

    				// News를 제외한 node 정의
    				self.entityNodes = _.orderBy(
    						_.filter(self.originNodes, function(n) {
    							return n.category !== "NEWS";
    						}), "weight", "desc"
    				);

    				var newsIdList = result.newsIds;
    				if (result.newsCluster) {
    					newsIdList.concat(result.newsCluster.split(","));
    				}

    				self.newsIds = newsIdList;
    				self.newsList = result.newsList;
    				self.renderRelativeNews();
    				self.replaceChartData();
    				$(`#analysis-news-cnt[data-seq='${chartSeq}']`).text(self.minRelatedNewsCount);
    				$(`#weightMax[data-seq='${chartSeq}']`).text(maxWeight);

    				var controls = new self.ctrls(self.minRelatedNewsCount, maxWeight, 10);
    				controls.ready();
    				$(".ctrl__counter-num").text(self.minRelatedNewsCount);
    				$(`#currentWeight[data-seq='${chartSeq}']`).val(self.minRelatedNewsCount);

    				$(`#relative-rate[data-seq='${chartSeq}']`).val(self.minRelatedNewsCount);
    				$(`#relative-rate[data-seq='${chartSeq}']`).attr("min", self.minRelatedNewsCount);
    				$(`#relative-rate[data-seq='${chartSeq}']`).attr("max", maxWeight);
    				$(`#relative-rate[data-seq='${chartSeq}']`).bind('keyup', function () {
    					var currentVal = $(this).val();
    					self.relatedRate = currentVal;
    					self.minRelatedNewsCount = currentVal;
    					$(`#analysis-news-cnt[data-seq='${chartSeq}']`).text(currentVal);
    					self.replaceChartData();
    				});

    				var initKBNode;
    				if (result.kbSearchPersonJson) {
    					var ps_node = result.kbSearchPersonJson;
    					initKBNode = {
    							larm_knowledgebase_sn: ps_node.larm_knowledgebase_sn,
    							category: ps_node.category,
    							kb_use_yn: ps_node.kb_use_yn,
    							label_ne: ps_node.label_ne,
    							kb_service_id: null
    					};
    				} else {
    					initKBNode = _.find(self.entityNodes, function(node) {
    						return self.resultParams.keyword.indexOf(node.label_ne) >= 0 && node.larm_knowledgebase_sn;
    					});
    				}

    				if (!initKBNode) {
    					initKBNode = _.find(self.entityNodes, function(node) {
    						return self.detailCategories.indexOf(node.category) > -1;
    					});
    				}


    				if (result.nodes.length == 0 && result.links.length == 0) {
    					
						openAlertPop({
							text: '조회된 데이터가 없습니다.',
							img: 'warning',
							showButtons: {
								cancel: false,	// 취소 버튼
								confirm: true	// 확인 버튼
							}
						});
    					return false;
    				}
    			}
    		}
    	});
    }
}

AnalysisRelationships.prototype.setSelectedTypes = function() {
    var self = this;

    self.selectedTypes = $(".btn-node-type.active").map(function(){
        return $(this).data("type");
    }).get();
}

AnalysisRelationships.prototype.getNewsList = function() {
    var self = this;
    var newsParam = self.newsResult.getResultParams();
    var params = {
        keyword: newsParam.searchKey,
        startDate: newsParam.startDate,
        endDate: newsParam.endDate,
        newsIds: self.newsIds.join(","),
        resultNo: self.newsIds.length
    };

    $.ajax({
        url: _contextPath + "/api/news/searchWithDetails.do",
        dataType: "json",
        method: "POST",
        data: $.param(params),
        success: function (d) {
            self.newsList = d;
            self.renderRelativeNews();
        }, error: function(err) {
        }
    });
}

AnalysisRelationships.prototype.renderRelativeNews = function() {
    var self = this;

    var relativeNewsHtml = self.relativeNewsTemplate({ newsList: self.newsList });
    self.$relativeNewsWrap.html(relativeNewsHtml).trigger('create');
}



AnalysisRelationships.prototype.ctrls = function(minCounter, maxCounter, counterStep) {
	var _this = this;

    this.counter = minCounter;
    this.els = {
      decrement: document.querySelector('.ctrl__button--decrement'),
      counter: {
        container: document.querySelector('.ctrl__counter'),
        num: document.querySelector('.ctrl__counter-num'),
        input: document.querySelector('.ctrl__counter-input')
      },
      increment: document.querySelector('.ctrl__button--increment')
    };

    this.decrement = function() {
      var counter = _this.getCounter();
      var nextCounter = (_this.counter > 0) ? (counter - counterStep < minCounter ? counter - 1 : counter - counterStep) : counter;

      //if (nextCounter < minCounter) {
    	//  return;
      //}
      if(nextCounter == 0 || nextCounter == 1)
	   {
	   	return;
	   }
      _this.setCounter(nextCounter);
      //_this.els.counter.input.setCounter(nextCounter); not a function
    };

    this.increment = function() {
      var counter = _this.getCounter();
      var nextCounter = (counter < 9999999999) ? (counter + counterStep > maxCounter ? counter + 1 : counter + counterStep) : counter;
      if (nextCounter > maxCounter) {
    	  return;
      }
      _this.setCounter(nextCounter);
     // _this.els.counter.input.setCounter(nextCounter); not a function
    };

    this.getCounter = function() {
      return _this.counter;
    };

    this.setCounter = function(nextCounter) {
      _this.counter = nextCounter;
    };

    this.debounce = function(callback) {
      setTimeout(callback, 100);
    };

    this.render = function(hideClassName, visibleClassName) {
      _this.els.counter.num.classList.add(hideClassName);

      setTimeout(function() {
        _this.els.counter.num.innerText = _this.getCounter();
        _this.els.counter.input.value = _this.getCounter();
        _this.els.counter.num.classList.add(visibleClassName);
      }, 100);

      setTimeout(function() {
        _this.els.counter.num.classList.remove(hideClassName);
        _this.els.counter.num.classList.remove(visibleClassName);
      }, 200);
    };

    this.ready = function() {
      _this.els.decrement.addEventListener('click', function() {
        _this.debounce(function() {
          _this.decrement();
          _this.render('is-decrement-hide', 'is-decrement-visible');
        });
      });

      _this.els.increment.addEventListener('click', function() {
        _this.debounce(function() {
          _this.increment();
          _this.render('is-increment-hide', 'is-increment-visible');
        });
      });

      _this.els.counter.input.addEventListener('input', function(e) {
        var parseValue = parseInt(e.target.value);
        if (!isNaN(parseValue) && parseValue >= 0) {
          _this.setCounter(parseValue);
          _this.render();
        }
      });

      _this.els.counter.input.addEventListener('focus', function(e) {
        _this.els.counter.container.classList.add('is-input');
      });

      _this.els.counter.input.addEventListener('blur', function(e) {
        _this.els.counter.container.classList.remove('is-input');
        _this.render();
      });
    };
}

AnalysisRelationships.prototype.initEvent = function() {
    var self = this;

    $(".analysis-btn").click(function(e) {
        self.keyword = self.$keyword.val();

        self.getNetworkData();
    });

    $("input[name='analysis-node-type']").change(function(e) {
        self.selectedTypes = $("input[name='analysis-node-type']:checked").map(function(){
            return $(this).val();
        }).get();

        self.replaceChartData();
    });

    $(".btn-node-type").click(function(e) {
		chartSeq = $(e.target).closest('.keyword-chat').data('seq');
        var $btn = $(this);
        if ($btn.hasClass("active")) {
            $btn.removeClass("active");
        } else {
            $btn.addClass("active");
        }

        self.setSelectedTypes();

        self.replaceChartData();
    });

    $(".network-relayout-btn").click(function() {
        self.chart.resetLayout();
        //removejscssfile("/js/plugins/jquery-ui.js", "js");
    });

    $(".network-fullscreen-btn").click(function() {
        var $btn = $(this);
        var isFullscreen = false;

        if ($btn.hasClass("active")) {
			$('.rel-control-acc').removeClass('full');
			$('.rel-control-info').removeClass('full');
			$('.rel-control-view').removeClass('full');
            $btn.removeClass("active");
        } else {
            isFullscreen = true;
			$('.rel-control-acc').addClass('full');
			$('.rel-control-info').addClass('full');
			$('.rel-control-view').addClass('full');
            $btn.addClass("active");
        }

        self.chart.fullscreen(isFullscreen);
    });

    $(".network-lock-btn").click(function() {
        var lockMode = "dynamic";
        var $btn = $(this);

        if ($btn.hasClass("active")) {
            $btn.removeClass("active");
            $('#lock_btn').find('i').removeClass('icon-lock-lock');
            $('#lock_btn').find('i').addClass('icon-lock');
        } else {
            lockMode = "static";
            $btn.addClass("active");
            $('#lock_btn').find('i').removeClass('icon-lock');
            $('#lock_btn').find('i').addClass('icon-lock-lock');          
        }

        self.chart.updateSettings({
            layout: {
                mode: lockMode
            }
        });
    });

    $(".network-download").click(function(e) {
			
	        e.preventDefault();
	        var fileNamePrefix = "시각화분석결과_" + moment().format("YYYYMMDD_HHMM");
	        var dataType = $(this).data("type");
	        var labelType = "";
	        if (dataType == "xlsx") {
	            labelType = "NewsData";
	            var fileName = fileNamePrefix + ".xlsx";
	            var nodeSheetName = "node_data";
	            var nodeData = [
	                ["ID", "Name", "Category", "Weight"]
	            ];
	            
	            _.forEach(self.renderedData.nodes, function(node) {
	            	
	            	//label_ne 값이 없는 경우 id를 사용하도록
	            	if(node.label_ne == undefined){
	            		node.label_ne = node.id;
	            	}
	            	
	                nodeData.push([
	                    node.id, node.label_ne.replace(/&apos;/gi, "'"), getTypeName(node.category), node.weight
	                ]);
	            });
	
	            var linkSheetName = "link_data";
	            var linkData = [
	                ["ID", "From", "To"]
	            ];
	            _.forEach(self.renderedData.links, function(link) {
	                linkData.push([
	                    link.id, link.from, link.to
	                ]);
	            });
	
	            var wb = XLSX.utils.book_new();
	            var nodeSheet = XLSX.utils.aoa_to_sheet(nodeData);
	            var linkSheet = XLSX.utils.aoa_to_sheet(linkData);
	
	            XLSX.utils.book_append_sheet(wb, nodeSheet, nodeSheetName);
	            XLSX.utils.book_append_sheet(wb, linkSheet, linkSheetName);
	
	            XLSX.writeFile(wb, fileName);
	        } else if (dataType == "xlsx-news") {
	            labelType = "GraphData";
	            var fileName = "시각화분석결과_뉴스데이터_" + moment().format("YYYYMMDD_HHMM") + ".xlsx";
	            var sheetName = "news_data";
	            var sheetData = [
	                [
	                    "뉴스 식별자", "일자", "언론사", "기고자", "제목",
	                    "통합 분류1", "통합 분류2", "통합 분류3",
	                    "사건/사고 분류1", "사건/사고 분류2", "사건/사고 분류3",
	                    "인물", "위치", "기관", "키워드", "본문"
	                ]
	            ];
	
	            _.forEach(self.newsList, function(item) {
	                var categoryNames = ["", "", ""];
	                var incidentNames = ["", "", ""];
	
	                var categoryName = item.category.replace(/[{()}]/g, '');
	                categoryName = categoryName.replace(/[\[\]']+/g, '');
	
	                if (categoryName.split(",").length) {
	                    _.forEach(categoryName.split(","), function(name, idx) {
	                        categoryNames[idx] = name.trim();
	                    });
	                }
	
	                if (item.category_incident.split(",").length) {
	                    _.forEach(item.category_incident.split(","), function(incidentName, idx) {
	                        incidentNames[idx] = incidentName.trim();
	                    });
	                }
	
	                var persons = [];
	                _.forEach(item.inPerson, function(item) {
	                    persons.push(item.label);
	                });
	
	                var locations = [];
	                _.forEach(item.inLocation, function(item) {
	                    locations.push(item.label);
	                });
	
	                var orgs = [];
	                _.forEach(item.inOrganization, function(item) {
	                    orgs.push(item.label);
	                });
	
	                var keywords = [];
	                _.forEach(item.inKeyword, function(item) {
	                    keywords.push(item.label);
	                });
	
	                sheetData.push([
	                    item.news_id,
	                    item.date,
	                    item.provider_name,
	                    item.byline,
	                    item.title,
	                    categoryNames[0],
	                    categoryNames[1],
	                    categoryNames[2],
	                    incidentNames[0],
	                    incidentNames[1],
	                    incidentNames[2],
	                    persons.join(", "),
	                    locations.join(", "),
	                    orgs.join(", "),
	                    keywords.join(", "),
	                    item.content
	                ]);
	            });
	
	            var wb = XLSX.utils.book_new();
	            var sheet = XLSX.utils.aoa_to_sheet(sheetData);
	
	            XLSX.utils.book_append_sheet(wb, sheet, sheetName);
	            XLSX.writeFile(wb, fileName);
	        } else if (dataType == "png") {
	            labelType = "Image(png)";
	            var fileName = fileNamePrefix + ".png";
	            self.chart.exportAsString("png", function(dataUri, mimeType, extension){
	                ZoomCharts.Internal.Base.Export.launchDownload(self.chart, mimeType, fileName, dataUri);
	            });
	        } else {
	            labelType = "Image(jpg)";
	            var fileName = fileNamePrefix + ".jpg";
	            self.chart.exportAsString("jpg", function(dataUri, mimeType, extension){
	                ZoomCharts.Internal.Base.Export.launchDownload(self.chart, mimeType, fileName, dataUri);
	            });
	        }
	
	        var label = 'Relationships_'.concat(labelType);
	        downloadLogging('analysis');
			
	
    });

    $(".download-chart-img-btn").click(function() {
        self.chart.export($(this).data("type"));
    });

    $(".analysis-network-view-mode-btn").click(function(e) {
        var $btn = $(this);
        //$btn.toggleClass("active");

        var visibleKB = $(".analysis-network-view-mode-btn[data-view='kb-detail']").hasClass("active");
        var visibleNews = $(".analysis-network-view-mode-btn[data-view='related-news']").hasClass("active");

        $(".network-news-sidebar").removeClass("double");
        if (visibleKB && visibleNews) {
            self.viewMode = "kb-network-news";
            $(".network-kbase-sidebar").removeClass("active");
            $(".network-news-sidebar").removeClass("active");
        } else if (visibleKB) {
            self.viewMode = "kb-network";

            $(".network-kbase-sidebar").removeClass("active");
            $(".network-news-sidebar").addClass("active");
        } else if (visibleNews) {
            self.viewMode = "network-news";

            $(".network-kbase-sidebar").addClass("active");
            $(".network-news-sidebar").removeClass("active").addClass("double");
        } else {
            self.viewMode = "network";

            $(".network-kbase-sidebar").addClass("active");
            $(".network-news-sidebar").addClass("active");
        }

        self.chart.updateSettings(self.getChartArea());
        self.chart.resetLayout();
    });

    $(".group-type-btn").click(function(e) {
		e.preventDefault();
		
		var $btn = $(this);
		
        if (!$btn.hasClass("active")) {
            $(".group-type-btn").removeClass("active");
            $btn.addClass("active");

            self.graphType = $btn.data("type");
            self.replaceChartData();
        }
    });

    $(document).on("click", ".analysis-network-news-header", function(e) {
        e.preventDefault();
        var newsId = $(this).data("id");
        $(".analysis-network-news[data-id='" + newsId + "']").toggleClass("active");
    });

    $(".applyWeightBtn").off().on('click', function(e) {
		chartSeq = $(this).closest('.keyword-chat').data('seq');
    	setTimeout(function(){ 
    		var start_val = $(`#analysis-news-cnt[data-seq='${chartSeq}']`).text();
    		var end_val = $(`#weightMax[data-seq='${chartSeq}']`).text();
    		var cr_val = $(`#currentWeight[data-seq='${chartSeq}']`).val();
    		if(cr_val != null && cr_val != ""){
    			if(Number(cr_val) <= 1 || Number(cr_val) > Number(end_val)){
    				openAlertPop({
						text: "가중치는 2 이상 "+end_val+"이하로 입력해주세요.",
						img: 'warning',
						showButtons: {
							cancel: false,	// 취소 버튼
							confirm: true	// 확인 버튼
						}
					});
    				return false;
    			}
    		}
    		
    		self.relatedRate = cr_val;
    		self.minRelatedNewsCount = cr_val;
    		self.replaceChartData();
    	}, 100);
    });

    $(document).on("click", ".save-network-modal-btn", function(e) {
    	if (authManager.checkAuth()) {
            $("#save-network-modal").modal();
        }
    });

    $(document).on("click", ".save-network-result-btn", function(e) {
        var resultParams = self.newsResult.getResultParams();
        var title = $("#network-modal-title").val();
        var content = $("#network-modal-content").val();

        var providerNames = [];
        _.forEach(resultParams.providerCodes, function(code){
            var providerText = $(".provider-btn[data-code='" + code + "']").text().trim();
            providerNames.push(providerText);
        });

        var categoryNames = [];
        _.forEach(resultParams.categoryCodes, function(code){
            var node = self.newsResult.search.detailSearch.categoryTree.getDataById(code);
            categoryNames.push(node.text);
        });

        var incidentNames = [];
        _.forEach(resultParams.incidentCodes, function(code){
            var node = self.newsResult.search.detailSearch.incidentTree.getDataById(code);
            incidentNames.push(node.text);
        });
        var chartData = {};
    	chartData['renderedData'] = self.renderedData;
    	chartData['nodeDetailData'] = self.nodeDetailData;
	  	chartData['resultData'] = self.newsList;
	  	chartData['masterData'] = self.resultParams;
	  	chartData['entityNodes'] = self.entityNodes;
	  	chartData['originLinks'] = self.originLinks;
        var graphCondi = {};
        graphCondi["networkSelectedTypes"] = self.selectedTypes;
        graphCondi["relativePersonCnt"] = $("#relative-person-cnt").text();
        graphCondi["relativeLocationCnt"] = $("#relative-location-cnt").text();
       // graphCondi["relativeLocationCnt"] = $("#relative-org-cnt").text();
        graphCondi["relativeOrgCnt"] = $("#relative-org-cnt").text();
        graphCondi["relativeKeywordCnt"] = $("#relative-keyword-cnt").text();
        graphCondi["networkGraphType"] = self.graphType;
        graphCondi["networkMinWeight"] = $("#analysis-news-cnt").text();
        graphCondi["networkMaxWeight"] = $("#weightMax").text();
        graphCondi["networkCurrentWeight"] = $("#currentWeight").val();

        var data = {
                srchwrd: resultParams.searchKey,
                searchStartDate: resultParams.startDate,
                searchEndDate: resultParams.endDate,
                searchProviderCode: resultParams.providerCodes.join(","),
                searchProviderNm: providerNames.join(","),
                searchCategoryPath: resultParams.categoryCodes.join(","),
                searchCategoryNm: categoryNames.join(","),
                searchIncidentCategoryPath: resultParams.incidentCodes.join(","),
                searchIncidentCategoryNm: incidentNames.join(","),
                title: title,
                detailTxt: content,
                chartType: self.graphType,
                chartDataJson: JSON.stringify(chartData),
                //chartSettingJson: JSON.stringify(self.chartSetting),
                chartSettingJson: JSON.stringify(graphCondi),
                shareYn: $("input[name='network-modcreateNetworkDataal-result-shared']").is(":checked") ? "Y" : "N",
                categoryCode1: $("#trend-result-category-code").val(),
                incidentCategoryCode1: $("#trend-result-incident-code").val(),
                categoryCode2: $("#trend-result-category-code2").val(),
                incidentCategoryCode2: $("#trend-result-incident-code2").val(),
                quotationKeyword1: resultParams.quotationKeyword1,
                quotationKeyword2: resultParams.quotationKeyword2,
                quotationKeyword3: resultParams.quotationKeyword3,
                objCnt: 0,
                graphCondi: $("#currentWeight").val()
            };

        if (title) {
            $.ajax({
                url: _contextPath + "/api/private/analysis/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: function (d) {
                    openAlertPop({
						text: "정상처리 되었습니다. \n 저장결과는 '마이페이지'의 '나의 뉴스분석' 메뉴에서 확인하실 수 있습니다. ",
						img: 'success',
						showButtons: {
							cancel: false,	// 취소 버튼
							confirm: true	// 확인 버튼
						}
					});
                    $("#save-network-modal").modal("hide");
                }, error: function(xhr, status, error) {
                    openAlertPop({
						text: "결과 저장 진행중 문제가 발생하였습니다.",
						img: 'warning',
						showButtons: {
							cancel: false,	// 취소 버튼
							confirm: true	// 확인 버튼
						}
					});
                }
            });
        } else {
			openAlertPop({
				text: '제목을 입력해 주시기 바랍니다.',
				img: 'warning',
				showButtons: {
					cancel: false,	// 취소 버튼
					confirm: true	// 확인 버튼
				}
			});
            return false;
        }
    });
}