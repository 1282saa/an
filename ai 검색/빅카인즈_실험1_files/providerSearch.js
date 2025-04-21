var codeCategoryListLevelKey = new Array();
var codeCategoryList = new Array();

//var codeCategoryMap = new Map();

var ProviderSearch = function (jsonSearchParam) {
	this.footerObjectCodeList = [];
	
    this.seq = 0;

    // this.$indexType = $("input[name='index-name']");

    // this.searchKeys = {};
    // this.$formWrap = $("#sl-item-wrap");
    // this.rowTemplate = Handlebars.getTemplate("search/detailRow");
	
	
    //this.providers = [];
    //this.providersTemplate = Handlebars.getTemplate("search/providers");
    //this.$providerWrap = $(".providers-wrap");
		
		
	//언론사 코드
	// this.categoryProviderAreaTemplate = Handlebars.getTemplate("ai/category_provider_area");
	this.categoryProviderGroupTemplate = Handlebars.getTemplate("ai/category_provider_group");
	this.categoryProviderListTemplate = Handlebars.getTemplate("ai/category_provider_list");
	this.eachCategoryProviderListTemplate = Handlebars.getTemplate("ai/each_category_provider_list");
		
	/*
    this.v3CategoriesTemplate = Handlebars.getTemplate("search/v3_categories");
	this.v3incidents = [];
    this.v3IncidentsTemplate = Handlebars.getTemplate("search/v3_incidents");
    
    this.newsIds = [];

    this.categoryCodes = []; //사용자 입력에 의한 분류 목록
    this.incidentCodes = []; //사용자 입력에 의한 사건/사고 목록
*/
    this.selectedClass = "selected";
	
	
    // this.addRow();
    this.getNewsProviders(jsonSearchParam);
	// this.getNewsCategories(jsonSearchParam);
    // this.getNewsInidents(jsonSearchParam);
    this.initEvent();
	
	// this.initSearchIndexType();
}

ProviderSearch.prototype.initSearchIndexType = function() {
    var self = this;
    $("button[name='search-index-type'][value='news']").trigger('click');
    $("input.detail-keyword").val("");
    self.setSearhGroup("news");
}

ProviderSearch.prototype.initDatepicker = function() {
    var self = this;

    var defaultOption = {
        viewMode: 'days',
        format: 'YYYY-MM-DD',
        defaultDate: moment().subtract(3, "month")
    };

    $("#search-begin-date").datetimepicker(defaultOption);
    $("#search-begin-date").data("DateTimePicker").minDate('1990-01-01');
    defaultOption.defaultDate = moment();
    $("#search-end-date").datetimepicker(defaultOption);
    $("#search-end-date").data("DateTimePicker").minDate('1990-01-01');

}

ProviderSearch.prototype.getNewsProviders = function(jsonSearchParam) {
    var self = this;
	$.ajaxSetup({
		beforeSend: function(xhr, settings) {
			if (settings.url && !settings.url.includes('bigkindsAi/undefined/')) {
				settings.url = settings.url.replace("undefined/", "./../../");
			}
		}
	});

    $.getJSON(_contextPath + "/api/providers.do", function(providers) {
        _.forEach(providers, function(provider) {
            provider.P_CODE = _.padStart(provider.CODE, 8, "0");
        });
        self.providers = providers;
        //$("#total-provider-cnt").text(self.providers.length);
		
        var total_provider_cnt = 0;
        _.forEach(_.groupBy(providers, 'GUBUN_CODE'), function(groupItems, groupKey) {
            if (groupKey <= 50) {
                total_provider_cnt += groupItems.length;
            }
        });

        var areaProviders = _.groupBy(self.providers, 'AREA_CODE');
		var groupedProviders = _.groupBy(providers, 'GUBUN_CODE');
	
		// 임시 주석
		/* var categoryProviderAreaHtml = self.categoryProviderAreaTemplate({
			areaProviders: areaProviders
		})
		$('#category_provider_area').html(categoryProviderAreaHtml); */
	
	
		var categoryProviderGroupHtml = self.categoryProviderGroupTemplate({
			groupedProviders: groupedProviders
		})
		$('#category_provider_group').html(categoryProviderGroupHtml);
		
		var categoryProviderListHtml = self.categoryProviderListTemplate({
			groupedProviders: groupedProviders
		})
		$('#category_provider_list').html(categoryProviderListHtml);
		
		var eachCategoryProviderListHtml = self.eachCategoryProviderListTemplate({
			groupedProviders: groupedProviders
		})
		$('#each_category_provider_list').html(eachCategoryProviderListHtml);


		if(jsonSearchParam != null){
			
			if (jsonSearchParam.providerCodes) {
				self.preSelectedProviderCodes = jsonSearchParam.providerCodes;
				self.initSetProviderCodes();
			}
		}
    });
}

ProviderSearch.prototype.getNewsCategories = function (jsonSearchParam) {
    var self = this;
    $.ajax({
        url: _contextPath + "/api/categories.do",
        dataType: "json",
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        success: function (data) {
            self.categories = data;

			/*
            _.forEach(self.categories, function (c) {
                totalCount++;

                if (c.children) {
                    _.forEach(c.children, function(cc) {
                        totalCount++;
                        if (cc.children) {
                            totalCount += cc.children.length;
                        }
                    });
                }
            });
            $("#total-category-count").text(totalCount);
            if (self.categoryCodes.length == 0) {
                $(".selected-category-cnt").text(totalCount);
            }
			*/

			self.categoryTree = $(".v3_categories-wrap").tree({
                primaryKey: 'id',
                uiLibrary: 'bootstrap',
                dataSource: self.categories,
                checkboxes: true
            });
			
			self.categoryTree.on('checkboxChange', function (e, $node, record, state) {
				
				self.categoryCodes = self.categoryTree.getCheckedNodes();
				
				//child
				if(state == "checked"){
					self.addSearchFooterCategoryObject(record);
				}else{
					self.removeSearchFooterCategoryObject(record);
				}
				
				
				/*
                if (self.categoryCodes.length > 0) {
                    //$(".selected-category-cnt").text(self.categoryCodes.length);
                    $("#category-filter-btn").addClass('active');
                } else {
                    //$(".selected-category-cnt").text(totalCount);
                    $("#category-filter-btn").removeClass('active');
                }
				*/
				
            });

			_.forEach(self.categoryCodes, function(code) {
                self.categoryTree.check($("li[data-id='" + code + "']"));
            });
			
			
			$(".v3_categories-wrap ul").find('[data-role=display]').on('click', function(){
	            $(this).parent().find('[data-role=checkbox]').find('input').trigger('click');
	        });
			
			/*
			codeCategoryListLevelKey = new Array();
			codeCategoryList = new Array();
			
			//최초 트리 데이터 정렬
			self.getChildren(self.categories);
			
			//level 별 키셋 데이터 중복 제거
			codeCategoryListLevelKey = codeCategoryListLevelKey.filter(function(a, i, self){
				return self.indexOf(a) === i;
			});
			
			var cateArrayList = new Array();
			
			//1. n개의 level 별 code category set 추가
			for(var i = 0; i < codeCategoryListLevelKey.length; i++){
				eval("var levelset" + codeCategoryListLevelKey[i] + " = new Array();");
			}
			
			//2. rowdata 화 된 list 데이터 만큼 계층 level 데이터 wrapping
			for(var i = 0; i < codeCategoryList.length; i++){
				
				//n개의 level key 값 기준으로 생성
				for(var j = 0; j < codeCategoryListLevelKey.length; j++){
					
					//데이터가 현재 level 과 같으면 개별 level array 에 추가 
					if(codeCategoryList[i].level == codeCategoryListLevelKey[j]){
						var obj = codeCategoryList[i];
						eval("levelset" + codeCategoryListLevelKey[j]).push(obj);
					}
				}
			}
			
			//만들어진 level 정보로 arrayList 묶음
			for(var i = 0; i < codeCategoryListLevelKey.length; i++){
				cateArrayList.push(eval("levelset" + codeCategoryListLevelKey[i]));
			}
			
			var v3CategoriesHtml = self.v3CategoriesTemplate({
				cateArrayList : cateArrayList
	        });

        	//self.$v3CategoriesrWrap.html(v3CategoriesHtml);

			$(".v3_categories-wrap").html(v3CategoriesHtml);
			

            var totalCount = 0;

            _.forEach(self.categories, function (c) {
                totalCount++;
			
                if (c.children) {
                    _.forEach(c.children, function(cc) {
                        totalCount++;
                        if (cc.children) {
                            totalCount += cc.children.length;
                        }
                    });
                }
            });
            $("#total-category-count").text(totalCount);
            if (self.categoryCodes.length == 0) {
                $(".selected-category-cnt").text(totalCount);
            }
			
			if(jsonSearchParam != null){
				if (jsonSearchParam.categoryCodes) {
					self.categoryCodes = jsonSearchParam.categoryCodes;
				}
				
				//통합분류 체크
				if(self.categoryCodes){
					for(var i = 0; i < self.categoryCodes.length; i++){
						self.setCategoryCodes(self.categoryCodes[i], true);
					}
				}
				
			}*/

        },
        error: function(err) {
        }
    });
}



ProviderSearch.prototype.getChildren = function (parentNode) {
	
	var self = this;
	
	for(var i = 0; i < parentNode.length; i++){
        
		//var codeyMap = new Map();
		
		//level key setting
		codeCategoryListLevelKey.push(parentNode[i].level);
		
		//data setting
		//codeyMap.set(parentNode[i].level, parentNode[i]);
		codeCategoryList.push(parentNode[i]);
		
        if(parentNode[i].children){
			self.getChildren(parentNode[i].children);
            //self.getChildren(parentNode[i]);
        }
    }
}

//카테고리 체크박스 체크
ProviderSearch.prototype.getChildrenCategory = function (parentId, isChecked) {
	
	var self = this;
	
	//root checked
	$(".category-checkbox[data-id='" + parentId + "']").prop("checked", isChecked);
	
	if(isChecked){
		self.addSearchFooterCategoryObject(parentId);
	}else{
		self.removeSearchFooterCategoryObject(parentId);
	}
	
	
	var parentCategory = $('.category-checkbox[data-parent=' + parentId + ']');
	
	for(var i = 0; i < parentCategory.length; i++){
		
		$(".category-checkbox[data-id='" + parentCategory[i].id + "']").prop("checked", isChecked);
		
		//child
		if(isChecked){
			self.addSearchFooterCategoryObject(parentCategory[i].id);
		}else{
			self.removeSearchFooterCategoryObject(parentCategory[i].id);
		}
		
		
		//parent 가 있는 경우 재귀 탐색	
		if($('.category-checkbox[data-parent=' + parentCategory[i].id + ']').length > 0){
			self.getChildrenCategory(parentCategory[i].id, isChecked);
		}
	}

}

ProviderSearch.prototype.renderSubCategories = function(id, level, isChecked) {
    var self = this;

    if (parseInt(level) == 1) {
        var category = _.find(self.categories, function(c) {return c.id == id;});
        var subCategories = category.children;
        _.forEach(subCategories, function(sc) {
            if (isChecked !== undefined) {
                sc.isChecked = isChecked;
            } else {
                sc.isChecked = (self.categoryCodes.indexOf(sc.id) > -1);
            }
        });
        var subCategoryHtml = self.subCategoriesTemplate({ categories: subCategories });
        $(".category-list[data-level='2']").html(subCategoryHtml);
    }
}

ProviderSearch.prototype.setDateCodes = function(code, isChecked) {
	var self = this;
	self.dateCodes = self.dateCodes || [];
	
	if (isChecked) {
		self.dateCodes.push(code);
	} else {
		self.dateCodes.splice(self.dateCodes.indexOf(code), 1);
	}
}


ProviderSearch.prototype.initSetProviderCodes = function() {
    var self = this;
    self.providerCodes = self.providerCodes || [];

    /*if (isChecked) {
        self.providerCodes.push(code);
    } else {
        self.providerCodes.splice(self.providerCodes.indexOf(code), 1);
    }*/

    $(".provider-btn").removeClass("selected");
    if (self.providerCodes && self.providerCodes.length) {
        _.forEach(self.providerCodes, function (code) {
            $(".provider-btn[data-code='" + code + "']").addClass("selected");
			$(".provider-btn[data-code='" + code + "']").prop("checked", true);
			self.addSearchFooterObject($(".provider-btn[data-code='" + code + "']"));
        });

        $(".selected-provider-cnt").text(self.providerCodes.length);
    } else {
        self.clearProviderCodes();
    }
}


ProviderSearch.prototype.setProviderCodes = function(code, isChecked) {
    var self = this;
    self.providerCodes = self.providerCodes || [];

    if (isChecked) {
        self.providerCodes.push(code);
    } else {
        self.providerCodes.splice(self.providerCodes.indexOf(code), 1);
    }
	
	$(".provider-area-btn").prop("checked", false);
    $(".gubun-checkbox").prop("checked", false);
	$(".provider-btn").prop("checked", false);
    $(".provider-area-btn").prop("checked", false);
    $(".provider-btn").removeClass("selected");
    $(".provider-area-btn").removeClass("selected");
	
	//언론사 footer 검색조건 삭제
	//$('.srch-sort').empty();
	self.footerObjectCodeList = [];
	
	$('.gubun-checkbox').parent().parent().removeClass('active');
	$('.detailsearch-provider').remove();
	
    $(".provider-btn").removeClass("selected");
    if (self.providerCodes && self.providerCodes.length) {
        _.forEach(self.providerCodes, function (code) {
            $(".provider-btn[data-code='" + code + "']").addClass("selected");
			$(".provider-btn[data-code='" + code + "']").prop("checked", true);
			self.addSearchFooterObject($(".provider-btn[data-code='" + code + "']"));
        });

        $(".selected-provider-cnt").text(self.providerCodes.length);
    } else {
        self.clearProviderCodes();
    }
}

ProviderSearch.prototype.clearProviderCodes = function() {
    var self = this;

    self.providerCodes = [];
    $(".provider-btn").removeClass("selected");
    $(".selected-provider-cnt").text(self.providers.length);
}

ProviderSearch.prototype.setCategoryCodes = function(code, isChecked) {
    var self = this;

	//self.getChildrenCategory(code, isChecked);
	//self.setCategoryTotalCount();
	
   if (isChecked) {
        self.categoryTree.check($("li[data-id='" + code + "']"));
   } else {
        self.categoryTree.uncheck($("li[data-id='" + code + "']"));
   }
}

ProviderSearch.prototype.clearCategoryCodes = function() {
    this.categoryTree.uncheckAll();
}

ProviderSearch.prototype.setIncidentCodes = function(code, isChecked) {
    var self = this;
	
	//self.getChildrenIncident(code, isChecked);
	//self.setIncidentTotalCount();
	
    if (isChecked) {
        self.incidentTree.check($("li[data-id='" + code + "']"));
    } else {
        self.incidentTree.uncheck($("li[data-id='" + code + "']"));
    }
}

ProviderSearch.prototype.clearIncidentCodes = function() {
    this.incidentTree.uncheckAll();
}

ProviderSearch.prototype.renderSubIncidents = function(id, level, parent, isChecked) {
    var self = this;

    var subIncidents = [];
    var targetLevel = -1;

    if (parseInt(level) == 1) {
        targetLevel = 2;
        var incident = _.find(self.incidents, function(i) {
            return i.id == id;
        });
        subIncidents = incident.children;

        $(".incident-list[data-level='3']").html('');
    } else if (parseInt(level) == 2) {
        targetLevel = 3;
        var parentIncident = _.find(self.incidents, function(i) {return i.id == parent;});
        var incident = _.find(parentIncident.children, function(i) {return i.id == id;});
        subIncidents = incident.children;
    }

    _.forEach(subIncidents, function(si) {
        if (isChecked !== undefined) {
            si.isChecked = isChecked;
        } else {
            si.isChecked = (self.incidentCodes.indexOf(si.id) > -1);
        }
    });

    var subIncidentHtml = self.subIncidentsTemplate({ incidents: subIncidents });
    $(".incident-list[data-level='" + targetLevel + "']").html(subIncidentHtml);
}

ProviderSearch.prototype.getNewsInidents = function (jsonSearchParam) {
    var self = this;
    $.ajax({
        url: _contextPath + "/api/incidents.do",
        dataType: "json",
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        success: function (data) {
            self.incidents = data;

            var totalCount = 0;

			/*

            _.forEach(self.incidents, function (c) {
                totalCount++;

                if (c.children) {
                    _.forEach(c.children, function(cc) {
                        totalCount++;
                        if (cc.children) {
                            totalCount += cc.children.length;
                        }
                    });
                }
            });
            $("#total-incident-count").text(totalCount);
			

            if (self.incidentCodes.length == 0) {
                $(".selected-incident-cnt").text(totalCount);
            }
			
			*/
			
			self.incidentTree = $(".v3_incidents-wrap").tree({
                primaryKey: 'id',
                uiLibrary: 'bootstrap',
                dataSource: self.incidents,
                checkboxes: true
            });
			
			self.incidentTree.on('checkboxChange', function (e, $node, record, state) {
				
                self.incidentCodes = self.incidentTree.getCheckedNodes();
				
				//child
				if(state == "checked"){
					self.addSearchFooterIncidentObject(record);
				}else{
					self.removeSearchFooterIncidentObject(record);
				}
				
				/*
                if (self.incidentCodes.length > 0) {
                    $(".selected-incident-cnt").text(self.incidentCodes.length);
                    $("#incident-filter-btn").addClass('active');
                } else {
                    $(".selected-incident-cnt").text(totalCount);
                    $("#incident-filter-btn").removeClass('active');
                }
				*/
            });
			
			_.forEach(self.incidentCodes, function(code) {
                self.incidentTree.check($("li[data-id='" + code + "']"));
            });
			
			$(".v3_incidents-wrap ul").find('[data-role=display]').on('click', function(){
	            $(this).parent().find('[data-role=checkbox]').find('input').trigger('click');
	        });
			
			
			/*
			codeCategoryListLevelKey = new Array();
			codeCategoryList = new Array();
			
			//최초 트리 데이터 정렬
			self.getChildren(self.incidents);
			
			//level 별 키셋 데이터 중복 제거
			codeCategoryListLevelKey = codeCategoryListLevelKey.filter(function(a, i, self){
			    return self.indexOf(a) === i;
			});
			
			var cateArrayList = new Array();
			
			//1. n개의 level 별 code category set 추가
			for(var i = 0; i < codeCategoryListLevelKey.length; i++){
			    eval("var levelset" + codeCategoryListLevelKey[i] + " = new Array();");
			}
			
			//2. rowdata 화 된 list 데이터 만큼 계층 level 데이터 wrapping
			for(var i = 0; i < codeCategoryList.length; i++){
			    
			    //n개의 level key 값 기준으로 생성
			    for(var j = 0; j < codeCategoryListLevelKey.length; j++){
			        
			        //데이터가 현재 level 과 같으면 개별 level array 에 추가 
			        if(codeCategoryList[i].level == codeCategoryListLevelKey[j]){
			            var obj = codeCategoryList[i];
			            eval("levelset" + codeCategoryListLevelKey[j]).push(obj);
			        }
			    }
			}
			
			//만들어진 level 정보로 arrayList 묶음
			for(var i = 0; i < codeCategoryListLevelKey.length; i++){
			    cateArrayList.push(eval("levelset" + codeCategoryListLevelKey[i]));
			}
			
			var v3IncidentsHtml = self.v3IncidentsTemplate({
			    cateArrayList : cateArrayList
			});
			
			$('.v3_incidents-wrap').html(v3IncidentsHtml);
			
			
			//self.$v3CategoriesrWrap.html(v3CategoriesHtml);
			
			//$(".v3_categories-wrap").html(v3IncidentsHtml);
			
			if(jsonSearchParam != null){
				if (jsonSearchParam.incidentCodes) {
					self.incidentCodes = jsonSearchParam.incidentCodes;
				}
				
				//사건사고
				if(self.incidentCodes){
					for(var i = 0; i < self.incidentCodes.length; i++){
						self.setIncidentCodes(self.incidentCodes[i], true);
					}
				}
				
			}
			*/

        },
        error: function(err) {
        }
    });
}

ProviderSearch.prototype.addRow = function(searchKeyItem) {
    var item = _.assign(searchKeyItem, {seq: this.seq});

    this.$formWrap.append(this.rowTemplate(item));
    this.seq++;
}

ProviderSearch.prototype.renderSearchKeys = function() {
    var self = this;
    self.seq = 0;
    self.$formWrap.html('');

    if (self.searchKeys && self.searchKeys.length) {
        _.forEach(self.searchKeys, function(searchKeyItem) {
            if (searchKeyItem.orKeywords) {
                searchKeyItem.orKeywordsStr = searchKeyItem.orKeywords.join(",");
                $(".detail-keyword.keyword-or").val(searchKeyItem.orKeywordsStr);
            }

            if (searchKeyItem.andKeywords) {
                searchKeyItem.andKeywordsStr = searchKeyItem.andKeywords.join(",");
                $(".detail-keyword.keyword-and").val(searchKeyItem.andKeywordsStr);
            }

            if (searchKeyItem.exactKeywords) {
                searchKeyItem.exactKeywordsStr = searchKeyItem.exactKeywords.join(",");
                $(".detail-keyword.keyword-exact").val(searchKeyItem.exactKeywordsStr);
            }

            if (searchKeyItem.notKeywords) {
                searchKeyItem.notKeywordsStr = searchKeyItem.notKeywords.join(",");
                $(".detail-keyword.keyword-not").val(searchKeyItem.notKeywordsStr);
            }

            self.addRow(searchKeyItem);
        });
    } else {
        self.addRow();
    }

    $(".tagsinput").tagsinput();
}

ProviderSearch.prototype.deleteRow = function(seq) {
    $(".detail-search-row[data-seq='" + seq + "']").remove();
}

ProviderSearch.prototype.getKeyItem = function(seq) {
    if (!this.searchKeys[seq]) {
        this.searchKeys[seq] = {
            keyword: "",
            orKeywords: [],
            andKeywords: [],
            exactKeywords: [],
            notKeywords: []
        };

        var $concatOption = $(".detail-search-row[data-seq='" + seq + "'] .concat-option");
        if ($concatOption.length) {
            this.searchKeys[seq].concatOption = $concatOption.val();
        }
    }

    return this.searchKeys[seq];
}

ProviderSearch.prototype.setSelectedCnt = function () {
    var self = this;

    var selectedClasses = [
        ".visible .provider-area-btn." + self.selectedClass,
        ".visible .provider-btn." + self.selectedClass
    ];

    var totalCnt = 0;
    _.forEach(selectedClasses, function(selectedClassName) {
        totalCnt += $(selectedClassName).length;
    });

    self.providerCodes = [];
    _.forEach($(".provider-btn.selected"), function(selectedProvider) {
        self.providerCodes.push($(selectedProvider).data('code'));
    });

    if (totalCnt > 0) {
        $("#provider-filter-btn").addClass('active');
    }
    if (totalCnt == 0) {
        totalCnt = self.providers.length;
        $("#provider-filter-btn").removeClass('active');
    }
    $(".selected-provider-cnt").text(totalCnt);
}

ProviderSearch.prototype.checkByAreaCode = function(areaCode) {
    
	var self = this;
	
	/*
	$(".provider-btn[data-areacode='" + areaCode + "']").addClass(this.selectedClass);
	$(".provider-btn[data-areacode='" + areaCode + "']").prop('checked', true);
	
	var arrObject = $(".provider-btn[data-areacode='" + areaCode + "']");
	
	for(var i = 0; i < arrObject.length; i++){
		self.addSearchFooterObject(arrObject[i]);
	}
	*/
	
	// 5개까지만 체크하도록
	var elements = $(".provider-btn[data-areacode='" + areaCode + "']");

	for (var i = 0; i < 5; i++) {
		$(elements[i]).addClass(this.selectedClass);
		$(elements[i]).prop('checked', true);
		self.addSearchFooterObject(elements[i]);
	}
	
    this.setSelectedCnt();
}

ProviderSearch.prototype.unCheckByAreaCode = function(areaCode) {
	
	var self = this;
	//해제 대상에서 제외할 언론사 확인  및 not selector 조건 생성
	var exceptArrObject = $("#category_provider_group .gubun-checkbox:checked");
	var notCond = "";
	for(var i = 0; i < exceptArrObject.length; i++){
		notCond += ":not([data-gubuncode='"+$(exceptArrObject[i]).val()+"'])";
	}
	
    $(".provider-btn[data-areacode='" + areaCode + "']"+notCond).removeClass(this.selectedClass);
	$(".provider-btn[data-areacode='" + areaCode + "']"+notCond).prop('checked', false);
	
	
	var arrObject = $(".provider-btn[data-areacode='" + areaCode + "']"+notCond);
	
	for(var i = 0; i < arrObject.length; i++){
		self.removeSearchFooterObject(arrObject[i]);
	}
	
    this.setSelectedCnt();
}

ProviderSearch.prototype.checkByGubunCode = function(gubunCode) {
	
	var self = this;
	var elements = $(".provider-btn[data-gubuncode='" + gubunCode + "']");
	
	for (var i = 0; i < elements.length; i++) {
		$(elements[i]).addClass(this.selectedClass);
		$(elements[i]).prop('checked', true);
		self.addSearchFooterObject(elements[i]);
	}
	this.setSelectedCnt();
}

ProviderSearch.prototype.unCheckByGubunCode = function(gubunCode) {
	
	var self = this;
	//해제 대상에서 제외할 언론사 확인  및 not selector 조건 생성
	var exceptArrObject = $("#category_provider_area .provider-area-btn:checked");
	var notCond = "";
	for(var i = 0; i < exceptArrObject.length; i++){
		notCond += ":not([data-areacode='"+$(exceptArrObject[i]).data("areacode")+"'])";
	}
	
	$(".provider-btn[data-gubuncode='" + gubunCode + "']"+notCond).prop('checked', false);
    $(".provider-btn[data-gubuncode='" + gubunCode + "']"+notCond).removeClass(this.selectedClass);

	var arrObject = $(".provider-btn[data-gubuncode='" + gubunCode + "']"+notCond);
	
	for(var i = 0; i < arrObject.length; i++){
		self.removeSearchFooterObject(arrObject[i]);
	}

    this.setSelectedCnt();
}

ProviderSearch.prototype.getKeywordItems = function(input, keyItem) {
    var $e = $(input);

    if ($e.hasClass("keyword-or")) {
        return keyItem.orKeywords;
    } else if ($e.hasClass("keyword-and")) {
        return keyItem.andKeywords;
    } else if ($e.hasClass("keyword-exact")) {
        return keyItem.exactKeywords;
    } else if ($e.hasClass("keyword-not")) {
        return keyItem.notKeywords;
    }

    return null;
}

ProviderSearch.prototype.setSearchDetails = function(searchParams) {
    if (searchParams && !_.isEmpty(searchParams)) {
        var indexName = searchParams.indexName || "news";
        $("input[name='index-name']").val(indexName);
        $("input[name='search-type']").val(indexName);
        
        if(indexName == "news"){
        	$("#search-filter-type").val(searchParams.searchFilterType || "1");
            $("#search-scope-type").val(searchParams.searchScopeType || "1");
        }else if(indexName == "editorial"){
        	$("#search-filter-type-editorial").val(searchParams.searchFilterType || "1");
            $("#search-scope-type-editorial").val(searchParams.searchScopeType || "1");
        }
        $("#search-sort").val(searchParams.searchSortType);
        $("#mainTodayPersonYn").val(searchParams.mainTodayPersonYn);
        $(".date-select-btn").removeClass("active");

        $("#search-begin-date").val(searchParams.startDate || moment().add(-3, "month").format("YYYY-MM-DD"));
        $("#search-end-date").val(searchParams.endDate || moment().format("YYYY-MM-DD"));

        $("#quotation-keyword2").val(searchParams.quotationKeyword2);
        $("#quotation-keyword3").val(searchParams.quotationKeyword3);

        if (searchParams.searchKeys && searchParams.searchKeys.length) {
            this.searchKeys = searchParams.searchKeys;
            this.renderSearchKeys();
        }

        if (searchParams.providerCodes) {
            this.preSelectedProviderCodes = searchParams.providerCodes;
            this.providerCodes = searchParams.providerCodes;
        }

        if (searchParams.categoryCodes) {
            this.categoryCodes = searchParams.categoryCodes;
        }

        if (searchParams.incidentCodes) {
            this.incidentCodes = searchParams.incidentCodes;
            this.incidentCodes = this.incidentCodes.map(String);
        }

        if (searchParams.dateCodes) {
            this.dateCodes = searchParams.dateCodes;
            $("#init-date-codes").val(JSON.stringify(this.dateCodes));
            $("#init-date-codes-report").val(JSON.stringify(this.dateCodes));
        }

        if (searchParams.newsIds && searchParams.newsIds.length) {
            this.newsIds = searchParams.newsIds;
        }
        
        if (searchParams.topicOrigin) {
        	this.topicOrigin = searchParams.topicOrigin;
        	$("#topicOrigin").val(this.topicOrigin);
        }

		//this.setCodeInit();

        //this.setCategoryTotalCount();
    }
}

 ProviderSearch.prototype.setCodeInit = function() {

	var self = this;
	
	//통합분류 체크
	if(self.categoryCodes){
		for(var i = 0; i < self.categoryCodes.length; i++){
			self.setCategoryCodes(self.categoryCodes[i], true);
		}
	}
	
	//사건사고 코드 셋팅
	if(self.incidentCodes){
		for(var i = 0; i < self.incidentCodes.length; i++){
			self.setIncidentCodes(self.incidentCodes[i], true);
		}
	}
	
	//언론사 셋팅
	if (self.preSelectedProviderCodes) {
		for(var i = 0; i < self.preSelectedProviderCodes.length; i++){
			self.setProviderCodes(self.preSelectedProviderCodes[i], true);
		}
	}

}


 ProviderSearch.prototype.getFullKeyword = function() {
    var self = this;
    var result = $("#total-search-key").val();

    var withComma = result.replace(new RegExp(',', 'g'), ', ');
    var singleSpace = withComma.replace(new RegExp('  ', 'g'), ' ');
    result = singleSpace;

	var indexName = $("input[name='index-name']").val();
    var _type_no = "0";
    if (indexName == "editorial") {
    	_type_no = "1";
    }
    var deatailSearchKeyOptions = [
        "or:eq("+_type_no+")", "and:eq("+_type_no+")", "exact:eq("+_type_no+")", "not:eq("+_type_no+")"
    ];
    
    self.searchKeys = [{}];

    _.forEach(deatailSearchKeyOptions, function(option) {
        var selectorName = ".detail-keyword.keyword-" + option;
        var optionName = option.replace(":eq("+_type_no+")","");
        var valuesName = optionName + "Keywords";
        if($(selectorName).val()) {
            self.searchKeys[0][valuesName] = [$(selectorName).val()];
        }
    });

    _.forEach(this.searchKeys, function(item, key) {
        var temps = [];
        if (item.keyword) {
            temps.push(item.keyword);
        }

        if (item.orKeywords && item.orKeywords.length) {
            var orKeywordArr = [];
            _.forEach(item.orKeywords, function(keyword) {
                orKeywordArr = orKeywordArr.concat(keyword.split(","));
            });
            if (result) {
                temps.push(" AND ");
            }
            temps.push("(" + orKeywordArr.join(" OR ") + ")");
        }

        if (item.andKeywords && item.andKeywords.length) {
            var andKeywordArr = [];
            _.forEach(item.andKeywords, function(keyword) {
                andKeywordArr = andKeywordArr.concat(keyword.split(","));
            });
            if (result || temps.length) {
                temps.push(" AND ");
            }
            temps.push("(" + andKeywordArr.join(" AND ") + ")");
        }

        if (item.exactKeywords && item.exactKeywords.length) {
            var exactTemps = [];
            _.forEach(item.exactKeywords, function(keyword) {
                _.forEach(keyword.split(","), function(word) {
                    exactTemps.push("\"" + word + "\"");
                });
            });
            if (result || temps.length) {
                temps.push(" AND ");
            }
            temps.push("(" + exactTemps.join(" AND ") + ")");
        }

        if (item.notKeywords && item.notKeywords.length) {
            var noteTemps = [];
            noteTemps.push(" NOT(");
            _.forEach(item.notKeywords, function(keyword) {
                _.forEach(keyword.split(","), function(word) {
                    noteTemps.push(word);
                });
            });
            noteTemps.push(")");

            temps.push(noteTemps.join(""));
        }

        if (item.concatOption) {
            result += " " + item.concatOption + " ";
        }

        result += temps.join(" ");
    });

    if ($("#rescan-keyword").val()) {
        var rescanKeyword = $("#rescan-keyword").val();
        var rescanKeywordArr = [];
        rescanKeywordArr = rescanKeywordArr.concat(rescanKeyword.split(","));
        if (rescanKeywordArr.length) {
            rescanKeyword = rescanKeywordArr.join(" AND ");
        }

        if (result) {
            result = "(" + result + ") AND " + rescanKeyword;
        } else {
            result = "(" + rescanKeyword + ")";
        }
    }

    if ($("#rescan-except-keyword").val()) {
        var rescanExceptKeyword = $("#rescan-except-keyword").val();
        var rescanExceptKeywordArr = [];
        rescanExceptKeywordArr = rescanExceptKeywordArr.concat(rescanExceptKeyword.split(","));

        if (rescanExceptKeywordArr.length) {
            rescanExceptKeyword = rescanExceptKeywordArr.join(" NOT ");
        }

        if (result) {
            result = "(" + result + ") NOT " + rescanExceptKeyword;
        } else {
            result = "";
        }
    }

    return result;
}

ProviderSearch.prototype.setFullKeyword = function () {
    this.fullSearchKey = this.getFullKeyword();
    $("#total-search-key").val(this.fullSearchKey);
}
//검색화면 날짜 초기화
ProviderSearch.prototype.clearDateFilter = function() {
    var self = this;
    //self.initDatepicker();
	//$(".date-select-btn[data-value='3'][data-type='month']").trigger("click");
    //$("#date-filter-div").toggleClass("open",false);
	
	var promise = new Promise(function(resolve, reject){
		self.removeSearchFooterDateObject();
		resolve();
	})
	
	promise.then(function(){
		$('.date-3month').trigger('click');
	})
	
}

ProviderSearch.prototype.clearProviderFilter = function() {
    var self = this;
    $(".provider-area-btn").prop("checked", false);
    $(".gubun-checkbox").prop("checked", false);
	$(".provider-btn").prop("checked", false);
    $(".provider-area-btn").prop("checked", false);
    $(".provider-btn").removeClass("selected");
    $(".provider-area-btn").removeClass("selected");
	
	//언론사 footer 검색조건 삭제
	//$('.srch-sort').empty();
	self.footerObjectCodeList = [];
	
	$('.gubun-checkbox').parent().parent().removeClass('active');
	$('.detailsearch-provider').remove();
	
    self.setSelectedCnt();
}

ProviderSearch.prototype.clearCategoryFilter = function() {
    var self = this;
    $(".category-checkbox").prop("checked", false);
    self.categoryCodes = [];
    self.clearCategoryCodes();
	$('.detailsearch-category').remove();
}

ProviderSearch.prototype.clearIncidenetFilter = function() {
    var self = this;
    $(".incident-checkbox").prop("checked", false);
    self.incidentCodes = [];
    self.clearIncidentCodes();
	$('.detailsearch-incident').remove();
}

ProviderSearch.prototype.clearByline = function() {
    $("#byline").val("");
    $("#byline-editorial").val("");
}

ProviderSearch.prototype.clearRescanKeyword = function() {
    $("#rescan-keyword").val("");
    $("#rescan-except-keyword").val("");
}

ProviderSearch.prototype.clearFilter = function() {
    var self = this;
    self.clearDateFilter();
    self.clearProviderFilter();
    self.clearCategoryFilter();
    self.clearIncidenetFilter();
    self.clearByline();
    self.clearRescanKeyword();
    self.clearDetails();
}

ProviderSearch.prototype.clearDetails = function() {
    $("#search-filter-type").val("1");
    $("#search-scope-type").val("1");
    $("#orKeyword1").val("");
    $("#andKeyword1").val("");
    $("#exactKeyword1").val("");
    $("#notKeyword1").val("");    
    $("#total-search-key-copy").val("");
    $("#quotation-keyword1").val("");
    $("#quotation-keyword2").val("");
    $("#quotation-keyword3").val("");
    $("#byline").val("");
    
    $("#search-filter-type-editorial").val("1");
    $("#search-scope-type-editorial").val("1");
    $("#orKeyword1-editorial").val("");
    $("#andKeyword1-editorial").val("");
    $("#exactKeyword1-editorial").val("");
    $("#notKeyword1-editorial").val("");
    $("#byline-editorial").val("");
    
}

ProviderSearch.prototype.getFormData = function () {
    var self = this;

    var providerCodes = [];
    _.forEach($(".provider-btn.selected"), function(provider) {
        providerCodes.push($(provider).data("code"));
    });
    
    var indexName = $("input[name='index-name']").val();
    var searchKey = $("#total-search-key").val();
    
    //특정 검색어 입력 시 강제치환 처리
    searchKey = replaceSpecificKeyword(searchKey);
    $("#total-search-key").val(searchKey);
    
    var _type = "";
    var _type_no = "0";
    if (indexName == "editorial") {
    	_type = "-editorial";
    	_type_no = "1";
    }
    var deatailSearchKeyOptions = [
        "or:eq("+_type_no+")", "and:eq("+_type_no+")", "exact:eq("+_type_no+")", "not:eq("+_type_no+")"
    ];

    var searchKeys = [{}];
    _.forEach(deatailSearchKeyOptions, function(option) {
        var selectorName = ".detail-keyword.keyword-" + option;
        var optionName = option.replace(":eq("+_type_no+")","");
        var valuesName = optionName + "Keywords";
        if($(selectorName).val()) {
            searchKeys[0][valuesName] = [$(selectorName).val()];
        }
    });


    var tmp1 = $(".result-filter.sort").val() == null ? "date" : $(".result-filter.sort").val();

    var formData = {
        indexName: indexName,
        searchKey: searchKey,
        searchKeys: searchKeys,
        byLine: $("#byline"+_type).val(),
        searchFilterType: $("#search-filter-type"+_type).val(),
        searchScopeType: $("#search-scope-type"+_type).val(),
        searchSortType:  $(".result-filter.sort").val(),
        sortMethod:  $(".result-filter.sort").val(),
        mainTodayPersonYn: $("#mainTodayPersonYn").val(),
		//날자값 입력이 없을 시 3개월 날짜 기간으로 셋팅
        startDate: $("#search-begin-date").val() == "" ? jquery.getDatepicker()._getDate(0,-3,0,'-') : $("#search-begin-date").val(),
        endDate: $("#search-end-date").val()  == "" ? jquery.getDatepicker()._getDate(0,-3,0,'-') : $("#search-end-date").val(),
        newsIds: self.newsIds,
        categoryCodes: self.categoryCodes,
        providerCodes: self.providerCodes,
        incidentCodes: self.incidentCodes,
        networkNodeType: $("#networkNodeType").val(),
        topicOrigin: $("#topicOrigin").val(),
        dateCodes: self.dateCodes,
        editorialIs: false 
    };

    if (indexName == "news_quotation") {
        var quotationKeyword1 = $("#quotation-keyword1").val();
        var quotationKeyword2 = $("#quotation-keyword2").val();
        var quotationKeyword3 = $("#quotation-keyword3").val();

        if (quotationKeyword1) {
            formData.quotationKeyword1 = quotationKeyword1;
        } else {
            formData.quotationKeyword1 = searchKey;
        }
        formData.quotationKeyword2 = quotationKeyword2;
        formData.quotationKeyword3 = quotationKeyword3;
        if (!quotationKeyword2 && !quotationKeyword3) {
        } else {
            formData.searchFilterType = "2";
            $("#search-filter-type").val("2");
        }

        if ($("#total-search-key-copy").val()) {
            formData.searchFilterType = "2";
            $("#search-filter-type").val("2");
        }
    }
    
    if (indexName == "editorial") {
    	formData.editorialIs = true;
    }

    if (formData.mainTodayPersonYn == "Y") {
        formData.searchFilterType = $("#search-analyzer").val();
        formData.searchScopeType = $("#search-scope").val();
    }

    return formData;
}

ProviderSearch.prototype.setIncidentTotalCount = function() {
	
    var self = this;
	
	self.incidentCodes = self.incidentTree.getCheckedNodes();
}


ProviderSearch.prototype.setCategoryTotalCount = function() {
    var self = this;

	self.categoryCodes = self.categoryTree.getCheckedNodes();
}

ProviderSearch.prototype.setSearhGroup = function(indexType) {
    var self = this;
    self.$indexType.val(indexType);
    $(".detail-search-group").hide();
    $(".detail-search-group[data-group='" + indexType + "']").show();
}

//날짜 검색조건 하단 footer 추가
ProviderSearch.prototype.addSearchFooterDateObject = function() {
	
	var self = this;
	
	$('#footersearch_searchDate').remove();
	
	//var cloneObj = $(obj).clone();
	var appendHtml = '<span id="footersearch_searchDate"><i>' + $('#search-begin-date').val() + ' ~ ' + $('#search-end-date').val() + '</i>'
	appendHtml += '<button type="button" onclick="removeSearchFooterDateObject();" class="btn-delete"><span class="sr-only">삭제</span></button></span>';
	
	$('.srch-sort').append(appendHtml);
	
}



//사건/사고 하단 조건 추가
ProviderSearch.prototype.addSearchFooterIncidentObject = function(record) {
	
	var self = this;
	
	var incidentCodeId = 'incident_' + record.id;
	var compareFlag = true;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == incidentCodeId){
			compareFlag = false ;
			break;
		}
	}
	
	var incidentName = record.text; //$('#'+id).parent().find('label').text();
	
	if(compareFlag){
		self.footerObjectCodeList.push(incidentCodeId);
		
		//var cloneObj = $(obj).clone();
		var appendHtml = '<span class="detailsearch-incident" id="' + incidentCodeId + '"><i>' + incidentName + '</i>'
		appendHtml += '<button type="button" onclick="removeSearchIncidentObject(' + "'" +  record.id + "'" + ');" class="detailsearch-incident btn-delete"><span class="sr-only">삭제</span></button></span>';
		
		$('.srch-sort').append(appendHtml);
	}

}

//사건/사고 하단 조건 삭제
ProviderSearch.prototype.removeSearchFooterIncidentObject = function(record) {
	
	var self = this;
	
	var incidentCodeId = 'incident_' + record.id;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == incidentCodeId){
			self.footerObjectCodeList.splice(i, 1);
			break;
		}
	}
	
	$('#' + incidentCodeId).remove();
	
	self.setIncidentTotalCount();
	
}


//카테고리 하단 조건 추가
ProviderSearch.prototype.addSearchFooterCategoryObject = function(record) {
	
	var self = this;
	
	var categoryCodeId = 'category_' + record.id;
	var compareFlag = true;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == categoryCodeId){
			compareFlag = false ;
			break;
		}
	}
	
	var categoryName = record.text; //$('#'+id).parent().find('label').text();
	
	if(compareFlag){
		self.footerObjectCodeList.push(categoryCodeId);
		
		//var cloneObj = $(obj).clone();
		var appendHtml = '<span class="detailsearch-category" id="' + categoryCodeId + '"><i>' + categoryName + '</i>'
		appendHtml += '<button type="button" onclick="removeSearchCategoryObject(' + "'" +  record.id + "'" + ');" class="detailsearch-category btn-delete"><span class="sr-only">삭제</span></button></span>';
		
		$('.srch-sort').append(appendHtml);
	}

}

//카테고리 하단 조건 삭제
ProviderSearch.prototype.removeSearchFooterCategoryObject = function(record) {
	
	var self = this;
	
	var categoryCodeId = 'category_' + record.id;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == categoryCodeId){
			self.footerObjectCodeList.splice(i, 1);
			break;
		}
	}
	
	$('#' + categoryCodeId).remove();
	
	self.setCategoryTotalCount();
	
}


//날짜  하단 검색조건 remove
ProviderSearch.prototype.removeSearchFooterDateObject = function() {
	
	$('#footersearch_searchDate').remove();
	$('.date-group-class').prop('checked', false);
	
	//$('#search-begin-date').val('');
	//$('#search-end-date').val('');
	
	//삭제 버튼 클릭 시 3개월 셋팅
	$('.date-3month').trigger('click');
	
}

//언론사 footer 하단 검색조건 add
ProviderSearch.prototype.addSearchFooterObject = function(obj) {
	if(obj == null) return;
	
	var self = this;
	var dataCode = typeof(obj.dataset) == 'undefined' ? obj.data('code') : obj.dataset.code;
	var compareFlag = true;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == dataCode){
			compareFlag = false ;
			break;
		}
	}
	
	var providerName = typeof(obj.name) == 'undefined' ? $(obj).attr('name') : obj.name;
	
	if(compareFlag){
		self.footerObjectCodeList.push(dataCode);
		
		var appendHtml = '<button type="button" class="sl-item detailsearch-provider" id="footersearch_' + dataCode + '">';
		appendHtml += '<span class="detailsearch-provider sl-value" data-code="' + dataCode + '">' + providerName + '</span>';
		appendHtml += '<span class="sl-del f-center detailsearch-provider" onclick="removeSearchFooterObj(' + providerName + ');">';
		appendHtml += '	<img src="../kindsAiAssets_2024/images/icon/close-icon.svg" alt="삭제"></span></button>';

		$('.sl-item-wrap').append(appendHtml);
		$('.sl-item-wrap').css('display','flex');
	}
}

//언론사 footer 하단 검색조건 remove
ProviderSearch.prototype.removeSearchFooterObject = function(obj) {
	var self = this;
	var dataCode = obj.dataset.code;
	
	for(var i = 0; i < self.footerObjectCodeList.length; i++){
		if(self.footerObjectCodeList[i] == dataCode){
			self.footerObjectCodeList.splice(i, 1);
			break;
		}
	}
	$('#footersearch_' + dataCode).remove();
	
	// #footersearch가 전부 제거되었는지 확인하고 .sl-item-wrap의 display를 none으로 변경
    if ($('#myFavoriteList').children().length === 0) {
        $('.sl-item-wrap').css('display', 'none');
    }
	
}

ProviderSearch.prototype.initEvent = function() {
    var self = this;
	
	$(document).on("click", ".detailSearchType", function(e) {
		$('.detailSearchType').removeClass("active");
		$(this).addClass("active");
    });
	
	
	$(".detail-keyword").keypress(function(e) {
	    if (e.which == 13) {
	        e.preventDefault();
	    }
	});
	
	$(document).on("click", ".search-form-body .static-dropdown-menu", function(e) {
	    e.stopPropagation();
	});
	
	$("button[name='search-index-type']").click(function(e) {
		
		$("button[name='search-index-type']").removeClass('active');
		$(this).addClass('active');

		var indexType = $(this).val();
    	self.setSearhGroup(indexType);
    });

    $(".detail-clear-btn").click(function(e) {
        self.clearDetails();
    });

/*
    $(document).on("click", ".provider-area-btn", function(e) {
        var areaCode = $(this).data("areacode");

        if ($(this).hasClass(self.selectedClass)) {
            $(this).removeClass(self.selectedClass);
            self.unCheckByAreaCode(areaCode);
        } else {
            $(this).addClass(self.selectedClass);
            self.checkByAreaCode(areaCode);
        }
    });
*/

	// '언론사 선택' 모달 개별 언론사 버튼 이벤트
	$(document).on("click", ".provider-btn", function(e) {
	
		var gubunCode = $(this).data('gubuncode');
		var areaCode = $(this).data('areacode');

		if ($(this).hasClass(self.selectedClass)) {
			$(this).removeClass(self.selectedClass);
			self.removeSearchFooterObject(this);
		} else {
			$(this).addClass(self.selectedClass);
			self.addSearchFooterObject(this);
		}
		
		if ($(".selected.provider-btn[data-gubuncode="+ gubunCode +"]").length == 0) {
			$(".gubun-checkbox[value="+ gubunCode +"]").prop("checked", false);
		}
		
		if ($(".selected.provider-btn[data-areacode="+ areaCode +"]").length == 0) {
			$(".provider-area-btn[data-areaCode="+ gubunCode +"]").prop("checked", false);
		}
		
		self.setSelectedCnt();
		fn_reDrawProvider();
	});

	// 언론사 그룹 선택
	$(document).on("change", ".gubun-checkbox", function(e) {
		var gubunCode = $(this).val();
		modalGubunCode = gubunCode;
		
		if(gubunCode != '30' && gubunCode != '31'){
			if ($(this).is(":checked")) {
				self.checkByGubunCode(gubunCode);
				$(this).parent().parent().addClass('active');
				//if(gubunCode == '30') $('.areaDay').prop("checked", true);
				//else if(gubunCode == '31') $('.areaWeek').prop("checked", true);
			} else {
				self.unCheckByGubunCode(gubunCode);
				$(this).parent().parent().removeClass('active');
				//if(gubunCode == '30') $('.areaDay').prop("checked", false);
				//else if(gubunCode == '31') $('.areaWeek').prop("checked", false);
			}
		}
		fn_reDrawProvider();
	});

	// '다른 언론사 선택' 모달 개별 언론사 버튼 이벤트
	$(document).on("click", ".each-provider-btn", function(e) {
		
		const elements = document.querySelectorAll('.each-provider-btn');
		const checkedCount = Array.from(elements).filter(element => element.checked).length;
		
		if (checkedCount > 5) {
			$(this).prop("checked",false);
			alert('5개 이상 선택할 수 없습니다.');
			/*
			Swal.fire(
				'5개 이상 선택할 수 없습니다.',
				'',
				'warning'
				,customClass: {
					popup: 'my-swal-popup'
				}
			)
			Swal.fire({
			  title: '알림',
			  text: '5개 이상 선택할 수 없습니다.',
			  customClass: {
			    popup: 'my-swal-popup'
			  }
			});
			return;
			*/
		}
	});
	
    $(".main-search-filter-init").click(function(e) {
        e.preventDefault();
        self.clearFilter();
    });

    $(".close-filter-btn").click(function(e) {
        $(".dropdown").removeClass("open");
    });

    $(".close-detail-search-btn").click(function(e) {
        $("#advanced-search-options").removeClass("active");
    });

    $(".clear-filter-btn").click(function(e) {
		
		//self.clearFilter();
		
		if($('#srch-tab1').is(':visible')){
			self.clearDateFilter();
		}
		if($('#srch-tab2').is(':visible')){
			self.clearProviderFilter();
		}
		if($('#srch-tab3').is(':visible')){
			self.clearCategoryFilter();
		}
		if($('#srch-tab4').is(':visible')){
			self.clearIncidenetFilter();
		}
		if($('#srch-tab5').is(':visible')){
			self.clearByline();
		    self.clearRescanKeyword();
		    self.clearDetails();
		}
		
    });
    
	//IE
	$(document).on('keypress','.input-date',function(e) {
		var agent = navigator.userAgent.toLowerCase();

			   	if ( (navigator.appName == 'Netscape' && navigator.userAgent.search('Trident') != -1) || (agent.indexOf("msie") != -1) ) {
			   		//IE
		   			var kcode = e.keyCode;
			   			/*key=(e)? e.keyCode:event.keyCode;*/
				   	if(kcode==13||kcode==65){
				   		self.addSearchFooterDateObject();
				   	}
			   	}    	 
		 });
}
