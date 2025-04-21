var NewsResult = function(search, step) {
    this.search = search;
    this.initResultParams();

    this.currentPage = this.resultParams.startNo || 1;
    this.perPage = this.resultParams.resultNumber || 10;

    this.dateFormat = "YYYY/MM/DD";
    this.ignoreNewsIds = [];

    this.$newsLoader = $(".news-loader");
    this.$ignoreNewsCnt = $(".ignore-news-cnt");
    this.$totalNewsCnt = $(".total-news-cnt");


    this.paginationTemplate = Handlebars.getTemplate("util/pagination_news_result");
    if (parseInt(step) > 1) {
        this.getNews();
    }

    /*this.$csKeywordsWrap = $(".cs-keywords-wrap");
    this.csKeywordsTemplate = Handlebars.getTemplate("news/cs-keywords");*/
	
	
	this.$csKeywordsWrapNews = $(".cs-keywords-wrap-news");
    this.csKeywordsTemplateNews = Handlebars.getTemplate("news/cs-keywords-news");
	this.$csKeywordsWrapQuotations = $(".cs-keywords-wrap-quotations");
    this.csKeywordsTemplateQuotations = Handlebars.getTemplate("news/cs-keywords-quotations");
	this.$csKeywordsWrapEditorial = $(".cs-keywords-wrap-editorial");
    this.csKeywordsTemplateEditorial = Handlebars.getTemplate("news/cs-keywords-editorial");

    this.checkCSKeywords();

    this.$resultWrap = $("#news-results");
    this.resultTemplate = Handlebars.getTemplate("news/results");

    this.$quotationResultWrap = $("#quotations-results");
    this.quotationResultTemplate = Handlebars.getTemplate("news/quotation-results");

    this.$editorialResultWrap = $("#editorial-results");
    this.editorialResultTemplate = Handlebars.getTemplate("news/results");

    //this.dateFilterWrap = $("#date-filter-wrap");
	this.dateFilterWrap = $(".date-filter-wrap");
    this.dateFilterTemplate = Handlebars.getTemplate("news/date-filter");

    this.$saveExpressionBtn = $(".save-expression-btn");

    this.initEvent();

    this.search.checkStep();
};

NewsResult.prototype.initResultParams = function() {
    var self = this;

    self.resultParams = self.search.detailSearch.getFormData();
    self.resultParams.startNo = self.currentPage || 1;
    self.resultParams.resultNumber = self.perPage || 10;

    self.csKeywords = [];
    var k = self.resultParams.searchKey;
    var regex = /^.*(\(|\)| AND | OR | NOT | - | \+ ).*$/;
    var flag = regex.test(k);
    
    //검색식에 괄호나 연산자가 없는 경우, csKeywords 설정
    if (self.resultParams.searchKey && !flag && self.resultParams.searchKey.split(",").length > 1) {
        _.forEach(self.resultParams.searchKey.split(","), function(csKey) {
            self.csKeywords.push({
                key: unescape(csKey).replace(/&apos;/g, "'"),
                checked: true
            });
        });
    }

    this.resultParams.providerCodes = this.resultParams.providerCodes || [];
    this.resultParams.categoryCodes = this.resultParams.categoryCodes || [];
    this.resultParams.incidentCodes = this.resultParams.incidentCodes || [];
    this.resultParams.dateCodes = this.resultParams.dateCodes || [];
    this.networkNodeType = this.resultParams.networkNodeType || "";
}

//검색창에서 엔터키 혹은 검색 버튼을 클릭했을때 기타 검색조건 초기화(기간, 분석제외기사 선택항목)
NewsResult.prototype.initSearchCondition = function() {
	var self = this;
    //self.clearResultFilter();
	$(".filter-input").prop("checked", false);

	//언론사, 통합분류, 사건/사고까지 초기화하려면 아래 코드 사용
    //self.search.detailSearch.clearProviderCodes();
    //self.search.detailSearch.clearCategoryCodes();
    //self.search.detailSearch.clearIncidentCodes();

    self.resultParams.providerCodes = [];
    self.resultParams.categoryCodes = [];
    self.resultParams.incidentCodes = [];
    self.resultParams.dateCodes = [];
    self.clearIgnoreNewsIds();
    $("#delnewsId").val(""); //검색식을 사용했을때 '검색식의 분석제외 뉴스id'가 세팅되는 부분
}

NewsResult.prototype.getResultParams = function() {
    var resultParams = this.resultParams;
    //Search 객체로 부터 정의된 searchParam을 기반으로 사용자 추가 설정 parameter 제공
    if (this.ignoreNewsIds.length) {
        resultParams.exceptNewsIds = this.ignoreNewsIds;
    }
    return resultParams;
}

NewsResult.prototype.checkCSKeywords = function() {
    if (this.csKeywords) {
        /*var csKeywordsHtml = this.csKeywordsTemplate({ csKeywords: this.csKeywords });
        this.$csKeywordsWrap.html(csKeywordsHtml);*/
   
		var csKeywordsHtmlNews = this.csKeywordsTemplateNews({ csKeywords: this.csKeywords });
		this.$csKeywordsWrapNews.html(csKeywordsHtmlNews);
		
		var csKeywordsHtmlQuotations = this.csKeywordsTemplateQuotations({ csKeywords: this.csKeywords });
		this.$csKeywordsWrapQuotations.html(csKeywordsHtmlQuotations);
		
		var csKeywordsHtmlEditorial = this.csKeywordsTemplateEditorial({ csKeywords: this.csKeywords });
		this.$csKeywordsWrapEditorial.html(csKeywordsHtmlEditorial);

    } else {
        //this.$csKeywordsWrap.html("");
		this.$csKeywordsWrapNews.html("");
		this.$csKeywordsWrapQuotations.html("");
		this.$csKeywordsWrapEditorial.html("");
    }
}

NewsResult.prototype.getNews = function(isCollapse, clearNewsIds, isCSsearch) {
    var self = this;

    self.initResultParams();

    if(!validationDate()){
    	return false;
    }

    if (self.resultParams.indexName == "news_quotation" && self.resultParams.mainTodayPersonYn == "Y") {
        self.resultParams.quotationKeyword1 = null;
        self.resultParams.quotationKeyword3 = self.resultParams.searchKey;
    }

    if (self.resultParams.indexName == "news_quotation" && !authManager.hasAuth()) {
        var start_date = moment(self.resultParams.endDate).subtract(1, 'month').format("YYYY-MM-DD");
        if (self.resultParams.startDate < start_date) {
	        $(".date-select-btn[data-type='month'][data-value=1]").click();
            alert("인용문 검색에서 비회원은 최대 1개월까지 검색이 가능합니다.");
            self.resultParams.startDate = start_date;
			//인용문시 1개월 강제 셋팅
			$('#search-begin-date').val(start_date);
        }
    }

    if (self.resultParams.indexName == "news" || self.resultParams.indexName == "editorial") {
        $("#total-search-key-copy").val("");
        $("#quotation-keyword2").val("");
        $("#quotation-keyword3").val("");
    }

    if (clearNewsIds) {
        self.resultParams.newsIds = [];
        self.search.detailSearch.newsIds = null;
    }

    if (isCSsearch) {
		
		/* var checkedKeywords = $(".cs-keyword-checkbox:checked").map(function(){
            return $(this).val();
        }).get();*/

		var checkedKeywords = [];
		var $ids = $('.cs-keyword-checkbox:checked');
		
		for(var i = 0; i < $ids.length; i++){
		    var chkId = $ids[i];
		
		    if($(chkId).is(":visible")){
		        if($(chkId).is(":checked") == true){
		            checkedKeywords.push($(chkId).val());
		        }
		    } 
		}

        $("#total-search-key").val(checkedKeywords.join(", "));
        // self.resultParams.searchKey = checkedKeywords.join(", ");
    }

    if (!self.resultParams.searchKey) {
        if (self.resultParams.searchKeys) {
            var detailSearchKeys = self.resultParams.searchKeys[0];

            if (!detailSearchKeys.orKeywords
                && !detailSearchKeys.andKeywords
                && !detailSearchKeys.exactKeywords
                && detailSearchKeys.notKeywords) {

                alert("제외 키워드는 단독으로 이용할 수 없습니다. \n기본 검색어 또는 다른 상세 키워드를 입력 후 검색하시기 바랍니다.");
                return false;
            }
        }
    }

    self.resultParams.isTmUsable = $("#filter-tm-use").is(":checked");
    self.resultParams.isNotTmUsable = $("#filter-not-tm-use").is(":checked");

    //self.resultParams.dateCodes = [];

    if ($(".filter-input[data-type='date']:checked").length) {
        _.forEach($(".filter-input[data-type='date']:checked"), function(dateCode) {
            if(self.resultParams.dateCodes.indexOf($(dateCode).val()) == -1){
        		self.resultParams.dateCodes.push($(dateCode).val());
        	}
        });
    }

    if ($("#rescan-keyword").val()) {
        self.resultParams.rescanKeyword = $("#rescan-keyword").val();
    }

    if ($("#rescan-except-keyword").val()) {
        self.resultParams.rescanExceptKeyword = $("#rescan-except-keyword").val();
    }

    if (self.resultParams) {
        self.$newsLoader.show();
        if (isCollapse) {
	
			$('#collapse-step-1').removeClass('open');
			$('#collapse-step-2').removeClass('open');
			$('#collapse-step-3').removeClass('open');
			
			$('#collapse-step-1-body').hide();
			$('#collapse-step-2-body').show();
			
			$('#collapse-step-2').addClass('open');

        }

        if (self.resultParams.indexName == "news") {
	
			$(".dataResult-tab li").removeClass('active');
			$(".dataResult-cont").removeClass('active');
			
			$("#dataResult-news").addClass('active');
			$('#news-results-tab').addClass('active');
			
            if(self.resultParams.byLine != null && self.resultParams.byLine != ''){
            	$(".contributor").text("기고자명 : "+self.resultParams.byLine);
            	$(".contributor").show();
            }else{
            	$(".contributor").hide();
            }
        } else if (self.resultParams.indexName == "news_quotation") {
          /*  $(".news-analysis__target-tabs li").removeClass('active');
            $(".news-analysis__target-tabs li:eq(1)").addClass('active');
            $(".news-result-tab-content .tab-pane").removeClass("active");
            $("#quotation-results-tab").addClass("active");
			*/

			$(".dataResult-tab li").removeClass('active');
			$(".dataResult-cont").removeClass('active');
			
			$("#dataResult-news_quotation").addClass('active');
			$("#quotation-results-tab").addClass('active');

            $(".contributor").hide();
        } else if (self.resultParams.indexName == "editorial") {
         /*   $(".news-analysis__target-tabs li").removeClass('active');
            $(".news-analysis__target-tabs li:eq(2)").addClass('active');
            $(".news-result-tab-content .tab-pane").removeClass("active");
            $("#editorial-results-tab").addClass("active");*/
            
			$(".dataResult-tab li").removeClass('active');
			$(".dataResult-cont").removeClass('active');
			
			$("#dataResult-editorial").addClass('active');
			$('#editorial-results-tab').addClass('active');


            if(self.resultParams.byLine != null && self.resultParams.byLine != ''){
            	$(".contributor").text("기고자명 : "+self.resultParams.byLine);
            	$(".contributor").show();
            }else{
            	$(".contributor").hide();
            }
        }

        self.triggerSearchIndex(self.resultParams.indexName);

        $(".total-search-key-wrap").hide();
        $(".total-search-key").text('');
        var fullKeyword = self.search.detailSearch.getFullKeyword();
        if (fullKeyword) {
            self.resultParams.searchKey = fullKeyword;

            //화면에 표기하기전에 unescapse 처리
            fullKeyword = _.unescape(fullKeyword);
            fullKeyword = _.replace(fullKeyword, /&apos;/g, "'");

            $(".total-search-key-wrap").show();
            $(".total-search-key").text(fullKeyword);
        }

        $(".quotation-search-key").hide();
        $(".quotation-search-key").text('');
        var quotationKeyword = "";
        if (self.resultParams.quotationKeyword2) {
            var quotationKeyword2 = ['(인용문: ', self.resultParams.quotationKeyword2, ') '];
            quotationKeyword += quotationKeyword2.join('');
        }
        if (self.resultParams.quotationKeyword3) {
            var quotationKeyword3 = ['(정보원: ', self.resultParams.quotationKeyword3, ') '];
            quotationKeyword += quotationKeyword3.join('');
        }
        if (quotationKeyword) {
            $(".quotation-search-key").show();
            $(".quotation-search-key").text(quotationKeyword);
        }
		
		
        $.ajax({
            url: _contextPath + "/api/news/search.do",
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            method: "POST",
            data: JSON.stringify(self.resultParams),
            success: function(d) {
            	if (d) {
                    self.totalCount = d.totalCount || 0;
                    self.isLimitPage = d.isLimitPage;

                    $(".date-cnt").text("(0)");
                    if (d.resultList) {
                    	
                    	//분석제외 체크 처리할 newsId 세팅
                    	if($("#delnewsId").length > 0 && $("#delnewsId").val() != ""){
                    		var delNewsIdArr = $("#delnewsId").val().split(",");
                    		_.forEach(delNewsIdArr, function(delNewsId){
                    			self.ignoreNewsIds.push(delNewsId.trim());
                    		});
                    		
                    		$("#delnewsId").val("");
                    	}
                    	
                    	var ignoreNewsCnt = formatNumber(self.ignoreNewsIds.length);
                        var totalNewsCnt = self.totalCount - ignoreNewsCnt;
                        
                        self.$totalNewsCnt.text(formatNumber(totalNewsCnt));
                        
                        self.resultList = d.resultList;
                        var rgx = new RegExp("^http");
                        var ignoreCnt = 0;
                        
                        //사용자가 선택한 분석제외 뉴스 개수 카운트
                        if(self.ignoreNewsIds && self.ignoreNewsIds.length > 0){
                        	ignoreCnt += self.ignoreNewsIds.length;
                        }
                        
                        _.forEach(self.resultList, function(newsItem) {
                            newsItem.FORMATTED_DATE = moment(newsItem.DATE).format(self.dateFormat);
                            newsItem.ignored = false;
                            
                            //원본주소 문자열에 프로토콜이 존재하는지 확인 후 없으면 http:// 추가
                            if(newsItem.PROVIDER_LINK_PAGE != "" && rgx.test(newsItem.PROVIDER_LINK_PAGE) == false){
                            	newsItem.PROVIDER_LINK_PAGE = "http://"+newsItem.PROVIDER_LINK_PAGE;
                            }
                            
                            if (self.ignoreNewsIds && self.ignoreNewsIds.length) {
                                if (self.ignoreNewsIds.indexOf(newsItem.NEWS_ID) >= 0) {
                                    newsItem.ignored = true;
                                }
                            }
                        });

                        self.renderNews();
                    }
                    
                    self.$ignoreNewsCnt.text(ignoreCnt); //분석제외 선택건수 표기
                    
                    $('.provider-fold-btn-hide').click();
            		$(".collapsed-provider").hide();
            		
                    $(".provider-cnt").text("(0)");
                    $(".filter-provider").prop("checked", false);
                    var providerCodeList = d.getProviderCodeList;
                    var openCnt = 0;
                    if (providerCodeList) {
                        providerCodeList.sort(function(a, b) { // 오름차순
                            return a.ProviderCode < b.ProviderCode ? -1 : a.ProviderCode > b.ProviderCode ? 1 : 0;
                        });

                        _.forEach(providerCodeList, function(providerCode,index) {
                            var providerCnt = "(" + formatNumber(providerCode.ProviderCount) + ")";
                            $(".provider-cnt[data-code='" + providerCode.ProviderCode + "']").text(providerCnt);
                            
                            if(providerCnt != 0 && openCnt < 5){
                            	$(".provider-cnt[data-code='" + providerCode.ProviderCode + "']").parent().parent().show();
                            	openCnt ++;
                            }
                            
                        });

                        if (self.resultParams.providerCodes && self.resultParams.providerCodes.length) {
                            _.forEach(self.resultParams.providerCodes, function(code) {
                                $(".filter-provider[value='" + code + "']").prop("checked", true);
                            });
                        }
                    }else{
                    	//뉴스검색 결과 없는 경우, 체크 처리
                    	if (self.resultParams.providerCodes && self.resultParams.providerCodes.length) {
                    		_.forEach(self.resultParams.providerCodes, function(code) {
                    			$(".filter-provider[value='" + code + "']").prop("checked", true);
                    		});
                    	} 
                    	
                    }
                    
//                    _.forEach($(".collapsed-provider"), function(abc, index){
//            			if(abc.children[0].children[0].innerHTML != "(0)", index < 5){
//            				abc.setAttribute('style','')
//            			}
//            		})

                    $(".category-cnt").text("(0)");
                    $(".filter-category").prop("checked", false);
                    if (d.getCategoryCodeList) {
                        _.forEach(d.getCategoryCodeList, function(categoryCode) {
                            var categoryCnt = "(" + formatNumber(categoryCode.CategoryCount) + ")";
                            $(".category-cnt[data-code='" + categoryCode.CategoryCode + "']").text(categoryCnt);
                        });

                        if (self.resultParams.categoryCodes && self.resultParams.categoryCodes.length) {
                            _.forEach(self.resultParams.categoryCodes, function(code) {
                                $(".filter-category[value='" + code + "']").prop("checked", true);
                            });
                        }
                    }else{
                    	//뉴스검색 결과 없는 경우, 체크 처리
                    	if (self.resultParams.categoryCodes && self.resultParams.categoryCodes.length) {
                    		_.forEach(self.resultParams.categoryCodes, function(code) {
                    			$(".filter-category[value='" + code + "']").prop("checked", true);
                    		});
                    	}
                    }

                    $(".incident-cnt").text("(0)");
                    if (d.getIncidentCodeList) {
                        _.forEach(d.getIncidentCodeList, function(incidentCode) {
                            var incidentCnt = "(" + formatNumber(incidentCode.IncidentCount) + ")";
                            $(".incident-cnt[data-sn='" + incidentCode.IncidentCode + "']").text(incidentCnt);
                        });

                        if (self.resultParams.incidentCodes && self.resultParams.incidentCodes.length) {
                            _.forEach(self.resultParams.incidentCodes, function(code) {
                                $(".filter-incident[data-sn='" + code + "']").prop("checked", true);
                            });
                        }
                    }else{
                    	//뉴스검색 결과 없는 경우, 체크 처리
                    	if (self.resultParams.incidentCodes && self.resultParams.incidentCodes.length) {
                    		_.forEach(self.resultParams.incidentCodes, function(code) {
                    			$(".filter-incident[data-sn='" + code + "']").prop("checked", true);
                    		});
                    	}
                    }

                    if (d.getDateCodeList) {
                        _.forEach(self.resultParams.dateCodes, function(dateCode) {
                            var dateCodeItem = _.find(d.getDateCodeList, function(c) { return c.date == dateCode; });
                            if (dateCodeItem) {
                                dateCodeItem.isChecked = true;
                            }
                        });
                        
                        _.forEach(d.getDateCodeList, function(dateCode){
                        	dateCode.dateCount = formatNumber(dateCode.dateCount);
                        });
                        
                        var dateFilterHtml = self.dateFilterTemplate({dates: d.getDateCodeList});
						self.dateFilterWrap.html(dateFilterHtml);
                    }
                    
                    $(".tm-use-cnt").text("(0)");
                    if (d.totalCntAnalysis) {
                        $(".tm-use-cnt").text("(" + formatNumber(d.totalCntAnalysis) + ")");
                    }
                    $(".not-tm-use-cnt").text("(0)");
                    if (d.totalCntNotAnalysis) {
                        $(".not-tm-use-cnt").text("(" + formatNumber(d.totalCntNotAnalysis) + ")");
                    }
                }

                /*
                //뉴스검색결과 0건일때 필터 체크 해제하는 코드.
                //체크해제로 다시 돌아갈수 없어서 주석처리. 예외상황 해결 후 ㅈ
                if(d.totalCount == 0){
                	$(".filter-date").prop("checked", false);
                	$(".filter-incident").prop("checked", false);
                	$(".filter-tm-use").prop("checked", false);
                	$(".filter-not-tm-use").prop("checked", false);
                }
                */

                if (!isCSsearch) {
                    self.checkCSKeywords();
                }

                self.$newsLoader.hide();

                //$(".checkbox-cancel").tooltip();

                if (self.resultParams.newsIds && self.resultParams.newsIds.length) {
                    $(".filter-input").prop("disabled", true);
                    $(".rescan-input").prop("disabled", true);
					$(".filter-tooltip").attr('data-tooltip-text', '오늘의 이슈에서는 제공되지 않습니다.')
                    $(".save-expression-modal-btn").hide();

                    var now = moment();
                    var analysisStartDay = moment();
                    var analysisEndDay = moment();

                    if(self.resultParams.endDate != undefined && self.resultParams.endDate != null){
                    	analysisStartDay = moment(self.resultParams.endDate);
                    	analysisEndDay = moment(self.resultParams.endDate);
                    }

                    var analysisStartTime = "08:00";
                    var analysisEndTime = "17:00";
                    var hour = parseInt(now.format("HH"));

                    if (hour < 8) {
                        analysisStartDay = analysisStartDay.subtract(1, 'days');
                        analysisEndDay = analysisEndDay.subtract(1, 'days');
                    } else if(hour >= 8 && hour < 17) {
                        analysisStartDay = analysisStartDay.subtract(1, 'days');
                        analysisEndTime = "08:00";
                    }

                    $(".start-date-key").text(analysisStartDay.format("YYYY-MM-DD") + " " + analysisStartTime);
                    $(".end-date-key").text(analysisEndDay.format("YYYY-MM-DD") + " " + analysisEndTime);
                } else {
                    $(".filter-input").prop("disabled", false);
                    $(".rescan-input").prop("disabled", false);
					$('.filter-tooltip').removeAttr('data-tooltip-text');
					
					//$(".filter-tooltip").tooltip().tooltip('destroy');
					
					 $(".save-expression-modal-btn").show();

                    $(".start-date-key").text(self.resultParams.startDate);
                    $(".end-date-key").text(self.resultParams.endDate);
                }

                if (!authManager.hasAuth()) {
                    $(".ignore-checkbox").prop("disabled", true);
					$(".non-member-tooltip-txt").css({ 'display' : '' });
                }
            }, error: function(e) {
                self.$newsLoader.hide();
            }
        })

        $('html').scrollTop(0);
    }
}

NewsResult.prototype.renderNews = function() {
    var self = this;

    var indexName = self.resultParams.indexName;
    //최대 20,000건까지만 페이지 제공하도록 pageCount 수치 재조정
    var temp_totalCount = self.totalCount > 20000 ? 20000 : self.totalCount;
    var pageCount = Math.ceil(temp_totalCount / self.perPage);
    
    /*self.totalCount = data.totalCount;*/
    if(temp_totalCount<=0){
    	pageCount = 1;
    	self.currentPage =1;
    }
    
    var pageHtml = self.paginationTemplate({
        pagination: {
            page: self.currentPage,
            pageCount: pageCount
        },
	    isLimitPage: self.isLimitPage
    });

    $(".search-info-sub-desc").hide();

    $(".search-info-sub-desc[data-index='" + indexName + "']").show();
    $(".search-info-quotation-at").hide();
    $(".search-info-quotation-of").show();

    $(".search-info-detail-desc").hide();
    if(self.resultParams.quotationKeyword2 != null && self.resultParams.quotationKeyword2 != '') {
        $(".search-info-detail-desc[data-index='quotation']").show();
        $(".quotation-keyword2").val(self.resultParams.quotationKeyword2);

        if (!self.resultParams.searchKey) {
            $(".search-info-quotation-desc").hide();
        } else {
            $(".search-info-quotation-of").hide();
            $(".search-info-quotation-at").show();
        }
        if (self.resultParams.quotationKeyword3 != null && self.resultParams.quotationKeyword3 != '') {
            $(".quotation-keyword2-sub").show();
            $(".quotation-keyword2-sub").text('인용문과');
        }
    }
    if(self.resultParams.quotationKeyword3 != null && self.resultParams.quotationKeyword3 != '') {
        $(".search-info-detail-desc[data-index='speaker']").show();
        $(".quotation-keyword3").val(self.resultParams.quotationKeyword3);
        if (!self.resultParams.searchKey) {
            $(".search-info-quotation-desc").hide();
        } else {
            $(".search-info-quotation-of").hide();
            $(".search-info-quotation-at").show();
        }
    }

    if (indexName == "news") {
        var newsHtml = self.resultTemplate({ newsList: self.resultList });
        self.$resultWrap.html(newsHtml);
        $(".news-results-pagination").html(pageHtml);

    } else if (indexName == "news_quotation") {
		//인용문 이미지 정상적으로 노출 안되는 부분 회피 로직
		for(var i = 0; i < self.resultList.length; i++){
			
			var newsImg = self.resultList[i].images;
			var sliceLength = newsImg.indexOf('/resources/images');
			var substrImgtxt = newsImg.substr(sliceLength);
			
			if(substrImgtxt.length <= 17){
			    self.resultList[i].images = null;
			}
						
		}

        var quotationsHtml = self.quotationResultTemplate({ quotationList: self.resultList });
        self.$quotationResultWrap.html(quotationsHtml);
        $(".quotations-results-pagination").html(pageHtml);
     
    } else if (indexName == "editorial") {
        var editorialHtml = self.editorialResultTemplate({ newsList: self.resultList });
        self.$editorialResultWrap.html(editorialHtml);
        $(".editorial-results-pagination").html(pageHtml);
   
        
    }
    if($(".news-results-alert").hasClass('d-block')){
    	$(".news-results-alert").show();
    	$(".paging-v3-wrp").css('margin-top','90px');
    	$(".data-result-hd.paging-v2-wrp").css('margin-top','90px');
    } else if($(".news-results-alert").hasClass('d-none')){
    	$(".news-results-alert").hide();
    	$(".paging-v3-wrp").css('margin-top','0px');
    	$(".data-result-hd.paging-v2-wrp").css('margin-top','0px');
    }
    
    $(".result-tooptip").tooltip();
}

NewsResult.prototype.getNetworkParams = function() {
    var self = this;
    var params = self.resultParams;
    var newsClusterIds = self.resultParams.newsIds;
    if (newsClusterIds && newsClusterIds.length) {
        if (newsClusterIds.length > 100) {
            newsClusterIds = _.chunk(newsClusterIds, 100)[0];
        }
        newsClusterIds = newsClusterIds.join(",");
    }

    var editorialIs = false;
    if(params.indexName == "editorial"){
    	editorialIs = true;
    }

    return {
        pageInfo: "newsResult",
        login_chk: null,
        LOGIN_SN: null,
        LOGIN_NAME: null,
        indexName: params.indexName,
        editorialIs: params.editorialIs,
        keyword: params.searchKey,
        byLine: params.byLine,
        searchScope: 1,
        searchFtr: 1,
        startDate: params.startDate,
        endDate: params.endDate,
        sortMethod: params.searchSortType,
        contentLength: 100,
        providerCode: params.providerCodes.join(","),
        categoryCode: params.categoryCodes.join(","),
        incidentCode: params.incidentCodes.join(","),
        dateCode: $(".filter-date:checked").map(function() {return this.value;}).get().join(','),
        highlighting: true,
        sessionUSID: null,
        sessionUUID: "test",
        listMode: null,
        categoryTab: null,
        newsId: null,
        newsCluster: newsClusterIds,
        delnewsId: self.ignoreNewsIds.join(","),
        delquotationId: null,
        delquotationtxt: null,
        filterProviderCode: null,
        filterCategoryCode: null,
        filterIncidentCode: null,
        filterDateCode: null,
        filterAnalysisCode: null,
        startNo: 1,
        resultNumber: 10,
        topmenuoff: null,
        resultState: "detailSearch",
        keywordJson: null,
        keywordFilterJson: null,
        realKeyword: null,
        keywordYn: "Y",
        totalCount: 5,
        interval: 1,
        quotationKeyword1: null,
        quotationKeyword2: null,
        quotationKeyword3: null,
        printingPage: null,
        searchFromUseYN: "N",
        searchFormName: null,
        searchFormSaveSn: null,
        mainTodayPersonYn: null,
        period: "3month",
        sectionDiv: 1000,
        maxNewsCount: 100,
        networkNodeType: self.networkNodeType
    };
}

NewsResult.prototype.clearResultFilter = function() {
    var self = this;

    $(".filter-input").prop("checked", false);

	//사건사고 검색조건 초기화
	self.search.detailSearch.clearIncidenetFilter();
	//통합조건 검색조건 초기화
	self.search.detailSearch.clearCategoryFilter();
	//언론사 검색조건 초기화
	self.search.detailSearch.clearProviderFilter();
	
	/*
    self.search.detailSearch.clearProviderCodes();
    self.search.detailSearch.clearCategoryCodes();
    self.search.detailSearch.clearIncidentCodes();
	*/
	
	self.search.detailSearch.dateCodes = [];

    self.resultParams.providerCodes = [];
    self.resultParams.categoryCodes = [];
    self.resultParams.incidentCodes = [];
    self.resultParams.dateCodes = [];

    $("#byline").val("");
    $("#byline-report").val("");
    
    self.getNews();
}

NewsResult.prototype.clearIgnoreNewsIds = function() {
    var self = this;

    self.ignoreNewsIds = [];

    //$(".news-item, .quotation-item").removeClass("ignore");
	$(".news-item, .quotation-item").removeClass("news-excep");

    //$(".ignore-checkbox").prop("checked", false);
	$(".ignore-checkbox").removeClass('ignore');

    self.$ignoreNewsCnt.text("0");
    self.$totalNewsCnt.text(formatNumber(self.totalCount));
    self.resultParams.exceptNewsIds = [];
}

NewsResult.prototype.triggerSearchIndex = function(indexName) {
    $("button[name='search-index-type'][value='" + indexName + "']").trigger("click");
    $("input[name='index-name']").val(indexName);
}

NewsResult.prototype.checkSearchKeyword = function(e) {
    var self = this;
    var flag = true;
    
    if (!self.resultParams.searchKey) {
    	flag = false;
        e.preventDefault();
        $(e.target).blur();
        $("#analytics-preview-tab").trigger("click");
        alert("분석 및 시각화를 위해서는 검색어가 필요합니다.");
    }
    
    return flag;
}

//시각화 분석 제공 전에 뉴스 검색인지, 인용문 검색인지 확인
NewsResult.prototype.isNewsSearch = function(e) {
	var self = this;
	var flag = true;
	
	//인용문 검색에서는 '데이터 다운로드' 외 시각화 분석 제공하지 않음.
	if(self.resultParams.indexName == "news_quotation"){
		$(e.target).blur();
		flag = false;
		alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
	}
	
	if(!flag){
		$("#analytics-preview-tab").click();
	}
	
	return flag;
}

//시각화 분석 사용 가능한 조건인지 확인
NewsResult.prototype.checkVisualizationCondition = function(e) {
	var self = this;
	var flag = false;

	//뉴스 검색에 대한 분석 요청인지 확인
	if(self.isNewsSearch(e)){
		//검색 키워드 존재여부 확인
		if(self.checkSearchKeyword(e)){
			//분석기사 필터 상태 확인
			var isTmUsable = self.resultParams.isTmUsable;
			var isNotTmUsable = self.resultParams.isNotTmUsable;
			
			/*
			 * 1. 둘다 체크된 경우
			 * 2. 분석기사만 체크된 경우
			 */
			if(isTmUsable == isNotTmUsable || (isTmUsable != undefined && !isNotTmUsable)){
				//최종
				flag = true;
			}else{
				/*
				//각 탭별 후처리 필요시 아래에서 처리
				switch (e.target.id) {
				case "analytics-network-tab": //관계도 분석
					break;
				case "analytics-trend-tab": //키워드 트렌드
					break;
				case "analytics-relational-word-tab": //연관어 분석
					break;
				case "analytics-info-extract-tab": //정보 추출
					break;
				default:
					break;
				}
				*/
				//this.$loader = $(".viz-network > .analysis-viz-loader");
				this.$loader = $('.analysis-viz-loader');
				self.$loader.hide();
				
				alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
				$(e.target).blur();
				$("#analytics-preview-tab").click();
			}
		}
	}
	
	return flag;
}

NewsResult.prototype.checkTabClickActive = function(e) {
	
	//$('.dataStep-tab li').removeClass('active');
	
	var $this = $(e.target),
	href = $this.attr('href'),
	$cont = $('.dataStep-cont'),
	$thidCont = $(href);
	e.preventDefault();
	$cont.hide();
	$thidCont.show();
	$('.dataStep-tab li').removeClass('active');
	$this.closest('li').addClass('active');
}

NewsResult.prototype.initEvent = function() {
    var self = this;

    $(document).on("click", ".btn-report-configuration", function(e) {
        e.preventDefault();

        if (!authManager.checkAuth()) {
            return false;
    	}

        if(self.resultParams.searchKey != ""){
        	var searchParam = self.resultParams;
        	searchParam.step = "2";
        	
        	$("#report-search-form-data").val(JSON.stringify(searchParam));
        	$("#report-search-form").submit();
        }else{
        	alert("보고서 생성은 검색어가 필요합니다.");
        }
        
    });

    $(document).on("click", ".page-link", function(e) {
        e.preventDefault();

        var page = $(this).data('page');
        if (page == self.currentPage) {
            return false;
        }
        self.currentPage = page;
        self.resultParams.startNo = self.currentPage;

        self.getNews();
    });

	$(document).on("keypress", ".enterevt", function(e) {
		/*페이징 input Enter Event*/
		if (e.which == 13) {
		var page = this.value;
        if (page == self.currentPage) {
            return false;
        }
        
        var endPage = null;
        var totalCount = self.totalCount;
        var perPage = self.perPage;
        var maxCount = 20000;
        
        /*마지막페이지*/
        if(totalCount/perPage<1){
        	endPage = 1;
        } else if(totalCount/perPage>1){
        	endPage = Math.ceil(totalCount/perPage);
        	if(totalCount>maxCount){
        		endPage =  Math.ceil(maxCount/perPage);
        	}
        }
        
        /*조건외 페이지 처리*/
        if(page <= "0"){
        	page = "1";
    	} else if(page > endPage){
    		page = endPage;
    	} 
        
           self.currentPage = page;
           self.resultParams.startNo = self.currentPage;
           self.getNews();
        } 
    });
    
    
    $("#rescan-btn").click(function(e) {
       e.preventDefault();

       self.search.detailSearch.rescanKeyword = $("#rescan-keyword").val();
       self.search.detailSearch.rescanExceptKeyword = $("#rescan-except-keyword").val();

       if (!self.resultParams.searchKey
           && !self.search.detailSearch.rescanKeyword
           && self.search.detailSearch.rescanKeyword == ""
           && self.search.detailSearch.rescanExceptKeyword) {

           alert("기본검색어가 없는 경우 결과 내 재검색에서 '키워드 제외' 기능은 사용이 불가능합니다.");
           return false;
       } else {
           var fullkeyword = self.search.detailSearch.getFullKeyword();
           if (self.resultParams.indexName == "news" || self.resultParams.indexName == "editorial") {
               self.resultParams.searchKey = fullkeyword;
           } else if (self.resultParams.indexName == "news_quotation") {
               $("#quotation-keyword1").val(fullkeyword);
           }

           self.currentPage = self.resultParams.startNo = 1;

           self.getNews();
       }
       $('.resulteRe-bx').removeClass('active');
    });

    $(document).on("change", ".filter-input", function(e) {
        var $filter = $(this);
        var type = $filter.data('type');
        var code = $filter.val();

        if (type == "provider") {
            self.search.detailSearch.setProviderCodes(code, $filter.is(":checked"));
            self.resultParams.providerCodes = self.search.detailSearch.providerCodes;
        } else if (type == "category") {
            self.search.detailSearch.setCategoryCodes(code, $filter.is(":checked"));
            self.resultParams.categoryCodes = self.search.detailSearch.categoryCodes;
        } else if (type == "incident") {
            var code = $filter.data("sn");
            self.search.detailSearch.setIncidentCodes(code, $filter.is(":checked"));
            self.resultParams.incidentCodes = self.search.detailSearch.incidentCodes;
        } else if (type == "date") {
            self.search.detailSearch.setDateCodes(code, $filter.is(":checked"));
            self.resultParams.dateCodes = self.search.detailSearch.dateCodes;
        }

        self.currentPage = self.resultParams.startNo = 1;

        self.getNews();
    });

    $(document).on("click change", ".ignore-checkbox", function(e) {
	
		$(this).toggleClass('ignore');
	
        var newsId = $(this).val();
        var $newsItem;
        if (self.resultParams.indexName == "news" || self.resultParams.indexName == "editorial") {
            $newsItem = $(".news-item[data-id='" + newsId + "']");
        } else if (self.resultParams.indexName == "news_quotation") {
            $newsItem = $(".quotation-item[data-id='" + newsId + "']");
            newsId += '_'+$newsItem.children().find('.quotation-item__title').text().trim(); 
            newsId = newsId.replace(/'/gm, '');
            newsId = newsId.replace(/\n\n                    \n                        중복/gm, '');
            newsId = newsId.replace(/\n\n\n                    \n                        예외/gm, '');
        }

        //if ($(this).is(":checked")) {
		if ($(this).hasClass("ignore")) {
            self.ignoreNewsIds.push(newsId.trim());
            //$newsItem.addClass("ignore");
			$newsItem.addClass('news-excep');
        } else {
            self.ignoreNewsIds.splice(self.ignoreNewsIds.indexOf(newsId.trim()), 1);
            //$newsItem.removeClass("ignore");
			$newsItem.removeClass('news-excep');
        }
        
        //공백문자 제거를 위해 필터링. 첫번째 filter에서 '', false, 0, undefined 등을 제거. 두번째 filter는 trim을 사용해서 공백문자(' ') 유형 제거. 
        self.ignoreNewsIds = self.ignoreNewsIds.filter(Boolean).filter(function(e){ return e.trim();});
        
        // self.resultParams.exceptNewsIds = self.ignoreNewsIds;
        var ignoreNewsCnt = formatNumber(self.ignoreNewsIds.length);
        var totalNewsCnt = self.totalCount - ignoreNewsCnt;
        self.$ignoreNewsCnt.text(ignoreNewsCnt);
        self.$totalNewsCnt.text(formatNumber(totalNewsCnt));
    });

    $(".refresh-result-filter-btn").click(function(e) {
        self.clearResultFilter();
    });


	$(".provider-fold-btn").click(function(e) {
		
/*		if($(this)[0].dataset.fold == 'fold'){
			$(".collapsed-provider").show();
			$(this)[0].dataset.fold = 'unfold';
		}else{
			$(".collapsed-provider").hide();
			$(this)[0].dataset.fold = 'fold';
		}*/
		
		_.forEach($(".collapsed-provider"), function(abc){
			if(abc.children[0].children[0].innerHTML != "(0)"){
				abc.setAttribute('style','')
			}
		})
		
		$('.provider-fold-btn-hide').show();
		$('.provider-fold-btn').hide();
		
    });
	
	$('.provider-fold-btn-hide').click(function(){
		
		_.forEach($(".collapsed-provider"), function(abc, index){
			if(abc.children[0].children[0].innerHTML != "(0)" && index > 5){
				abc.setAttribute('style','display:none;')
			}
		})
		
		$('.provider-fold-btn-hide').hide();
		$('.provider-fold-btn').show();
	});

	/*
    $(".provider-unfold-btn").click(function(e) {
        $(this).blur();
        $(".collapsed-provider").removeClass("hidden");
    });

    $(".provider-fold-btn").click(function(e) {
        $(".collapsed-provider").addClass("hidden");
    });
	*/
	
	
    $(".clear-ignore-btn").click(function(e) {
        if (confirm("분석 제외 대상으로 지정한 뉴스를 해제하시겠습니까?")) {
            self.clearIgnoreNewsIds();
        }
    });

    $(".result-filter.sort").change(function(e) {
        self.currentPage = self.resultParams.startNo = 1;
        self.resultParams.sortMethod = $(this).val();
        self.getNews();
    });

    $(".result-filter.per-page").change(function(e) {
        self.currentPage = self.resultParams.startNo = 1;
        self.resultParams.resultNumber = self.perPage = $(this).val();
        self.getNews();
    });

	$(".analysis-target-tab").on("click", function(e) {
    //$(".analysis-target-tab").on("shown.bs.tab", function(e) {
        var $tab = $(e.target);
        var indexName = $tab.data("index");

        self.clearIgnoreNewsIds();
        self.resultParams.startNo = self.currentPage = 1;
        self.triggerSearchIndex(indexName);

        if (indexName == "news") {
        	$("#search-filter-type").val(self.resultParams.searchFilterType);
        	$("#search-scope-type").val(self.resultParams.searchScopeType);
        	$("#byline").val(self.resultParams.byLine);
        	
            if (!self.resultParams.searchKey) {
                var quotationKeyword2 = self.resultParams.quotationKeyword2;
                var quotationKeyword3 = self.resultParams.quotationKeyword3;
                if (quotationKeyword2) {
                    $("#total-search-key").val(quotationKeyword2);
                } else if (!quotationKeyword2 && quotationKeyword3) {
                    $("#total-search-key").val(quotationKeyword3);
                }
            }
            if (!self.resultParams.searchKeys) {
            	if(self.resultParams.searchKeys[0].hasOwnProperty('orKeywords')){
            		$("#orKeyword1").val(self.resultParams.searchKeys[0].orKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('andKeywords')){
            		$("#andKeyword1").val(self.resultParams.searchKeys[0].andKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('exactKeywords')){
            		$("#exactKeyword1").val(self.resultParams.searchKeys[0].exactKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('notKeywords')){
            		$("#notKeyword1").val(self.resultParams.searchKeys[0].notKeywords[0]);
            	}
            }
        } else if (indexName == "news_quotation") {
            //$("#quotation-keyword1").val(self.resultParams.searchKey);
            $("#quotation-keyword1").val(self.resultParams.topicOrigin);
        } else if (indexName == "editorial") {        	
        	$("#search-filter-type-editorial").val(self.resultParams.searchFilterType);
        	$("#search-scope-type-editorial").val(self.resultParams.searchScopeType);
        	$("#byline-editorial").val(self.resultParams.byLine);
        	
            if (!self.resultParams.searchKey) {
                var quotationKeyword2 = self.resultParams.quotationKeyword2;
                var quotationKeyword3 = self.resultParams.quotationKeyword3;
                if (quotationKeyword2) {
                    $("#total-search-key").val(quotationKeyword2);
                } else if (!quotationKeyword2 && quotationKeyword3) {
                    $("#total-search-key").val(quotationKeyword3);
                }
            }
            
            if (!self.resultParams.searchKeys) {
            	if(self.resultParams.searchKeys[0].hasOwnProperty('orKeywords')){
            		$("#orKeyword1-editorial").val(self.resultParams.searchKeys[0].orKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('andKeywords')){
            		$("#andKeyword1-editorial").val(self.resultParams.searchKeys[0].andKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('exactKeywords')){
            		$("#exactKeyword1-editorial").val(self.resultParams.searchKeys[0].exactKeywords[0]);
            	}
            	if(self.resultParams.searchKeys[0].hasOwnProperty('notKeywords')){
            		$("#notKeyword1-editorial").val(self.resultParams.searchKeys[0].notKeywords[0]);
            	}
            }
        }

        self.getNews();

        var target = $tab.data("target");
        $(".news-result-tab-content .tab-pane").removeClass("active");
        $(target).addClass("active");
        
        	$(".news-results-alert").removeClass('d-block');
        	$(".news-results-alert").hide();

    });

    $(".news-search-btn").click(function(e) {
        e.preventDefault();

        //새로 검색하는 경우, 기타 검색조건 초기화
        self.initSearchCondition();
        self.currentPage = 1;
		
		//뉴스 검색 시 '오늘의 이슈' 여부 구분값 초기화
        $("#isTodayIssue").val("false");

        self.getNews(true, true);
        $("#select1 option[value='trust']").remove();
        $('div.cllap2-sum').hide();
    });

    $("#total-search-key").keyup(function(e) {
        if (e.which == 13) {
            e.preventDefault();

			//뉴스 검색 시 '오늘의 이슈' 여부 구분값 초기화
        	$("#isTodayIssue").val("false");

            //새로 검색하는 경우, 기타 검색조건 초기화
            self.initSearchCondition();
            self.currentPage = 1;
            self.getNews(true, true);
            $("#select1 option[value='trust']").remove();
            $('div.cllap2-sum').hide();
        }
    });

    $(".save-expression-modal-btn").click(function(e) {
		
        if (authManager.checkAuth()) {
            $("#save-expression-modal").modal();
			
			if($("#selectedSearchformSn").val() != "" && $("#user-expression-sn-list").length){
            	$.getJSON(_contextPath + "/api/private/expressions/index.do", {_: new Date().getTime()}, function(data) {
            		self.expressionList = data;
            		var options = '<option value=""> ::: 신규 검색식 저장(검색식명 입력 필요) :::</option>';
            		var option = '<option value="@@srchformulaSaveSn@@">@@srchrormulaNm@@</option>';
            		
            		$.each(data, function(i, v){
            			options += option.replace("@@srchformulaSaveSn@@", v.srchformulaSaveSn).replace("@@srchrormulaNm@@", v.srchrormulaNm);
            		});
            		
            		$("#user-expression-sn-list").html(options);
            		$("#user-expression-list-wrap").show();
            		
            		if($("#selectedSearchformSn").val() != ""){
            			$("#user-expression-sn-list").val($("#selectedSearchformSn").val());
            			$("#expression-name").attr("readonly", "readonly");
            		}
            		
            		$("#user-expression-list-wrap").attr('style', 'display:block !important');
            		
            	});
            }
            
            var expressionParams = _.cloneDeep(self.resultParams);
            if (self.ignoreNewsIds.length) {
                expressionParams.exceptNewsIds = self.ignoreNewsIds;
            }
            $("#srchindex").val(expressionParams.indexName);
            $("#srchwrd").val(expressionParams.searchKey);
            $("#searchType").val(expressionParams.searchScopeType);
            $("#searchFilter").val(expressionParams.searchFilterType);
            $("#searchStartDate").val(expressionParams.startDate);
            $("#searchEndDate").val(expressionParams.endDate);
            /*$("#searchProviderCode").val(expressionParams.providerCodes);*/
            $("#quotationKeyword1").val(expressionParams.quotationKeyword1);
            $("#quotationKeyword2").val(expressionParams.quotationKeyword2);
            $("#quotationKeyword3").val(expressionParams.quotationKeyword3);

            var indexName;
            if(expressionParams.indexName=='news'){
            	indexName =  '뉴스';
            }else if(expressionParams.indexName=='news_quotation'){
            	indexName = '인용문';
            }else {
            	indexName = '사설';
            }

            var conditionTexts = [];
            conditionTexts.push("검색어: " + expressionParams.searchKey);
            conditionTexts.push("기간: " + expressionParams.startDate + " ~ " + expressionParams.endDate);
            conditionTexts.push("검색대상: " + indexName);
            
            if(expressionParams.indexName=='editorial'){
            	conditionTexts.push("검색어 범위: " + $("#search-scope-type-editorial option:selected").text());
                conditionTexts.push("검색어 처리: " + $("#search-filter-type-editorial option:selected").text());
            }else {
            	conditionTexts.push("검색어 범위: " + $("#search-scope-type option:selected").text());
                conditionTexts.push("검색어 처리: " + $("#search-filter-type option:selected").text());
            }

            if (expressionParams.providerCodes) {
                $("#searchProviderCode").val(expressionParams.providerCodes.join(","));
                var providerNames = [];

                _.forEach(expressionParams.providerCodes, function(code) {
                    providerNames.push($(".provider-btn[data-code='" + code + "']").siblings().text().trim());
                });

                $("#searchProviderNm").val(providerNames.join(","));
                if (providerNames) {
                    conditionTexts.push("언론사: " + providerNames.join(","));
                }
            }

            if (expressionParams.categoryCodes) {
                $("#searchCategoryPath").val(expressionParams.categoryCodes.join(","));

                var categoryNames = [];
                _.forEach(expressionParams.categoryCodes, function(code) {
                    var finded = false;
                    var categoryName = "";
                    _.forEach(self.search.detailSearch.categories, function(category1) {
                        if (category1.id == code) {
                            categoryName = category1.text;
                            return false;
                        }

                        if (category1.children) {
                            _.forEach(category1.children, function(category2) {
                                if (category2.id == code) {
                                    categoryName = category2.text;
                                    finded = true;
                                    return false;
                                }
                            });
                        }

                        if (finded) { return false; }
                    });
                    categoryNames.push(categoryName);
                });

                $("#searchCategoryNm").val(categoryNames.join(","));

                if (categoryNames) {
                    conditionTexts.push("통합분류: " + categoryNames.join(","));
                }
            }

            if (expressionParams.incidentCodes) {
                $("#searchIncidentCategoryPath").val(expressionParams.incidentCodes.join(","));

                var incidentNames = [];
                _.forEach(expressionParams.incidentCodes, function(code) {
                    var finded = false;
                    var incidentName = "";
                    _.forEach(self.search.detailSearch.incidents, function(incident1) {
                        if (incident1.id == code) {
                            incidentName = incident1.text;
                            return false;
                        }

                        if (incident1.children) {
                            _.forEach(incident1.children, function(incident2) {
                                if (incident2.id == code) {
                                    incidentName = incident2.text;
                                    finded = true;
                                    return false;
                                }

                                _.forEach(incident2.children, function(incident3) {
                                    if (incident3.id == code) {
                                        incidentName = incident3.text;
                                        finded = true;
                                        return false;
                                    }
                                });

                                if (finded) { return false; }
                            });
                        }

                        if (finded) { return false; }
                    });

                    incidentNames.push(incidentName);
                });

                $("#searchIncidentCategoryNm").val(incidentNames.join(","));

                if (categoryNames) {
                    conditionTexts.push("사건/사고: " + incidentNames.join(","));
                }
            }

            $("#expression-condition").html(conditionTexts.join("<br>"));

            var filterTexts = [];

            var dateCodes = [];
            if ($(".filter-input[data-type='date']:checked").length) {
                _.forEach($(".filter-input[data-type='date']:checked"), function(dateCode) {
                    dateCodes.push($(dateCode).val());
                });
            }

            if (dateCodes && dateCodes.length) {
                $("#filterSearchYear").val(dateCodes.join(","));
                filterTexts.push("기간: " + dateCodes.join(","));
            }
            $("#expression-filter-condition").html(filterTexts.join("<br>"));

            if (expressionParams.exceptNewsIds && expressionParams.exceptNewsIds.length) {
                $("#exclusionNewsId").val(expressionParams.exceptNewsIds.join(","));
                $("#expression-ignore-news-ids").html(expressionParams.exceptNewsIds.join("<br>"))
            } else {
                $("#expression-ignore-news-ids").html("");
            }
        }
	
	
    });

    $("#user-expression-sn-list").on("change", function(e){
    	var $nameInput = $("#expression-name");
    	$nameInput.val("");
    	
    	if($(this).val() == ""){
    		$nameInput.removeAttr("readonly");
    		$nameInput.focus();
    	}else{
    		$nameInput.attr("readonly", "readonly");
    	}
    });
    
    $(".save-expression-btn").click(function(e) {
    	var expressionData = getFormData($("#expression-form"));
        var url = "/api/private/expressions/create.do";
        var isNewSaveForm = true;
        var selectedSearchformSn = $("#selectedSearchformSn").val();
        
        //저장식 SN이 존재하는지 확인. 존재하면 기존 검색식에 대한 수정 프로세스
    	//if($("#user-expression-sn-list").length && $("#user-expression-sn-list option:selected").val() != ""){
		if($("#user-expression-list-wrap").is(":visible") && $("#user-expression-sn-list option:selected").val() != ""){
			//검색식 수정에 필요한 설정
			isNewSaveForm = false;
			url = "/api/private/expressions/update.do";
			$("#srchformulaSaveSn").val(selectedSearchformSn);
			
			//기존 검색식 명칭 자동입력
			$("#expression-name").val($("#user-expression-sn-list option:selected").text());
			
			//갱신된 form 값 재설정
			expressionData = getFormData($("#expression-form"));
        }else{
        	//검색식 신규 생성에 불필요한 값 제거
        	delete expressionData.srchformulaSaveSn;
        }
        
        //신규 생성인 경우, 검색식명 입력 확인
        if(isNewSaveForm && !expressionData.srchrormulaNm){
        	alert("검색식명을 입력하세요.");
        	return;
        }
        
        $.ajax({
            url: url,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(expressionData),
            success: function(d) {
                alert("정상 처리 되었습니다.");
                $("#save-expression-modal").modal('hide');
                
                //clear
                $("#expression-name").val("").removeAttr("readonly");
                $("#selectedSearchformSn").val("");
                $("#srchformulaSaveSn").val("");
                $("#user-expression-list-wrap").hide();
            }, 
            error: function(xhr, status, error) {
                alert("검색식 저장 중 문제가 발생하였습니다. 문제가 지속되면 운영팀에 문의하시기 바랍니다.");
            }
        });
    });

    $(document).on("change", ".cs-keyword-checkbox", function(e) {
       /* var checkedKeywords = $(".cs-keyword-checkbox:checked").map(function(){
            return $(this).val();
        }).get();*/
		
		
		var checkedKeywords = [];
		var $ids = $('.cs-keyword-checkbox:checked');
		
		for(var i = 0; i < $ids.length; i++){
		    var chkId = $ids[i];
		
		    if($(chkId).is(":visible")){
		        if($(chkId).is(":checked") == true){
		            checkedKeywords.push($(chkId).val());
		        }
		    } 
		}

        _.forEach(self.csKeywords, function(csKeyItem) {
            if (checkedKeywords.indexOf(csKeyItem.key) > -1) {
                csKeyItem.checked = true;
            } else {
                csKeyItem.checked = false;
            }
        });
        self.getNews(false, false, true);
    });

    $('#collapse-step-1').on('shown.bs.collapse', function () {
        $(".rescan-input").val("");
    });

	$('.step-3-click').on('click', function () {
		$('#collapse-step-3').trigger('click');
	});

    $('#collapse-step-3').on('click', function (e) {
		
		if($(this).hasClass('open')){
			
			var $cont = $('.dataStep-cont'),
			$thidCont = $('#analytics-data-download');
			e.preventDefault();
			$cont.hide();
			$thidCont.show();
			$('.dataStep-tab li').removeClass('active');
			$('.dataStep-tab li:eq(0)').addClass('active');
			
			
			//$("#analytics-preview-tab").trigger("click");
			if (!self.previewData) {
	            self.previewData = new PreviewData(self);
				//$("#analytics-preview-tab").trigger("click");
	        } else {
	            self.previewData.renderPreview();
	        }
			
			/*$("#analytics-preview-tab").show();
	        if (!self.previewData) {
	            //self.previewData = new PreviewData(self);
				$("#analytics-preview-tab").trigger("click");
	        } else {
	            self.previewData.renderPreview();
	        }*/
		}
		
    });

    
    //데이터 다운로드 탭
    $("#analytics-preview-tab").on('click', function(e) {
        self.checkTabClickActive(e);
		if (self.previewData) {
            self.previewData.renderPreview();
        } else {
            self.previewData = new PreviewData(self);
        }
    });
    
    //키워드 트렌드 탭
    $('#analytics-trend-tab').on('click', function (e) {
    	//뉴스 검색에 대한 분석 요청인지 확인
    	if(self.checkVisualizationCondition(e)){
			self.checkTabClickActive(e);
			if (!self.trendChart) {
				self.branch = "detail"; // 메인페이지 트랜드 차트와 뉴스 검색 트랜드 차트 분기를 위해 branch 변수 추가
				self.trendChart = new TrendChart(self);
			} else {
				self.trendChart.getTrendData();
			}
    	}
    });

    //관계도 분석 탭    
    $('#analytics-network-tab').on('click', function (e) {

		//뉴스 검색에 대한 분석 요청인지 확인
    	if(self.checkVisualizationCondition(e)){
			if (self.search.currentStep || authManager.checkAuth()) {
				self.checkTabClickActive(e);
				if (!self.analysisRelationships) {
					self.analysisRelationships = new AnalysisRelationships(self, relChart);
				} else {
					self.analysisRelationships.updateResultData(self);
				}
			} else {
				e.preventDefault();
				return false;
				//$("#analytics-preview-tab").trigger("click");
			}
    	}
		
    });

    //연관어 분석 탭
    $('#analytics-relational-word-tab').on('click', function (e) {
    	
		//뉴스 검색에 대한 분석 요청인지 확인
    	if(self.checkVisualizationCondition(e)){
			self.checkTabClickActive(e);
			if (!self.relationWord) {
				self.relationWord = new RelationalWord(self);
			}
			self.relationWord.render();
    	}
		
    });

    //정보추출 탭
    $('#analytics-info-extract-tab').on('click', function (e) {
    	
		//뉴스 검색에 대한 분석 요청인지 확인
    	if(self.checkVisualizationCondition(e)){
    		if (authManager.checkAuth()) {
				self.checkTabClickActive(e);
    			if (!self.infoExtractor) {
    				self.infoExtractor = new InfoExtractor();
    			}
    			
    			self.infoExtractor.setSearchParams(self.getResultParams());
    			
    		} else {
    			e.preventDefault();
    		}
    	}
		
    });
/*
    $('#analytics-info-extract-tab').on('shown.bs.tab', function (e) {
    	if(self.resultParams.indexName == "news_quotation"){
    		//인용문 검색 상태인지 확인
    		alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
    		$('#analytics-info-extract-tab').blur();
    		$("#analytics-preview-tab").click();
    		return;
    	}else if(self.resultParams.isNotTmUsable && !self.resultParams.isTmUsable){
    		alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
    		$('#analytics-info-extract-tab').blur();
    		$("#analytics-preview-tab").click();
    		return;
    	}
    });
*/
    // 히스토리 tab event
    $('#analytics-history-tab').on('shown.bs.tab', function (e) {
        if (!self.historyData) {
            self.historyData = new HistoryData(self);
        } else {
            self.historyData.renderHistory();
        }
    });

    $("#expression-name").keypress(function(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
        }
    });

    $("#collapse-step-1").on("shown.bs.collapse", function() {
        /*
    	if ((self.resultParams.indexName == "news" && (Object.keys(self.resultParams.searchKeys[0]).length != 0 || self.resultParams.byLine != "")) ||
            (self.resultParams.indexName == "news_quotation" && (self.resultParams.quotationKeyword2 != "" || self.resultParams.quotationKeyword3 != ""))) {
            $("#detail-filter-btn").click();
        }
    	*/
        //검색 후 상세검색 필터가 항상 열려있도록 수정
        $("#detail-filter-div").toggleClass("open", true);
    });
    
    
}