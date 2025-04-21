function checkFileExt(e){
	var acceptFileExt = [
		'jpg', 'png', 'xls', 'xlsx', 'doc', 'docx', 'hwp', 'pdf',
		'JPG', 'PNG', 'XLS', 'XLSX', 'DOC', 'DOCX', 'HWP', 'PDF'
	];
	var $obj = $(e);

	if(e.files.length > 0){
		$.each(e.files, function(i, v){
			var fileExt = v.name.substring(v.name.lastIndexOf('.')+1, v.name.length);
			if(acceptFileExt.indexOf(fileExt) == -1){
				alert('첨부할 수 없는 확장자의 파일이 등록되었습니다.');
				$obj.val('');
			}
		});
	}

}

/**
 * 날짜비교
 * 시작일이 종료일보다 같거나 작으면 true
 * @author 정재훈 jhjeong@saltlux.com
 * @modified 2016. 2. 24.
 * @param d1 시작일 (Date형 또는 String(yyyy-mm-dd)형)
 * @param d2 종료일 (Date형 또는 String(yyyy-mm-dd)형)
 * @returns {Boolean}
 */
function diffDate(d1, d2) {
	if(d1 == " "){
		return true;
	}

	var first = new Date();
	var second = new Date();

	if (typeof d1 === 'object' && d1 instanceof Date) {
	    first.setTime(d1.getTime());
	} else {
		var d = d1.split('-');
		var _d = new Date(d[0], (d[1]-1), d[2])
		first.setTime(_d.getTime());
	}

	if (typeof d2 === 'object' && d2 instanceof Date) {
		second.setTime(d1.getTime());
	} else {
		var d = d2.split('-');
		var _d = new Date(d[0], (d[1]-1), d[2]);
		second.setTime(_d.getTime());
	}

	// Compare the two dates by comparing the millisecond
	// representations.
	//console.log("first = " + first.getTime())
	//console.log("second = " + second.getTime())
	if (first.getTime() <= second.getTime()) {
	    return true;
	}
	else {
	    return false;
	}
}

//날짜 유효성 체크(유효하지 않은경우 false리턴)
function validationDate() {
	var fromdate = new Date();
	var dateFormatCheck = /[\d{4}][\-]\d{2}[\-]\d{2}$/; //yyyy-mm-dd형식의 데이터인지 체크
    var regNumber = /^(199[0-9]|20\d{2})-(0[0-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/;//숫자형식을 사용하고 1990년데이터 까지만 검색 가능하도록 체크
    
	if ($("#search-begin-date").val() !== null && $("#search-begin-date").val() !== "" && $("#search-begin-date").val() !== undefined) {
		if(!dateFormatCheck.test($("#search-begin-date").val())){
			alert("시작일자가 올바른 형식이 아닙니다.\n올바른 형식: YYYYY-MM-DD");
			return false;
		}else if(!regNumber.test($("#search-begin-date").val())){
			alert("시작일자가 올바르지 않습니다. 다시 입력해 주세요. \n(1990년1월1일 이전 데이터는 검색이 불가능합니다.)");
			return false;
		}else{		
			var m = moment($("#search-begin-date").val(), 'YYYY-MM-DD');
			if(!m.isValid()){
				alert("시작일자가 존재하지 않는 날짜 입니다. 다른 날짜를 입력하세요.");
				return false;	
			}
		}
	}else{
		$("#search-begin-date").val("1990-01-01"); //입력값이 없는경우 최대로 검색가능한 일자를 넣어준다
	}

	if ($("#search-end-date").val() !== null && $("#search-end-date").val() !== "" && $("#search-end-date").val() !== undefined) {
	    
		if(!dateFormatCheck.test($("#search-end-date").val())) {
			alert("종료일자가 올바른 형식이 아닙니다.\n올바른 형식: YYYYY-MM-DD");
			return false;
		}else if(!regNumber.test($("#search-end-date").val())){
			alert("종료일자가 올바르지 않습니다. 다시 입력해 주세요.");
			return false;
		}else{
			var m = moment($("#search-end-date").val(), 'YYYY-MM-DD');
			if(!m.isValid()){
				alert("종료일자가 존재하지 않는 날짜 입니다. 다른 날짜를 입력하세요.");
				return false;
			}
		}
		
	}else{
		 //입력값이 없는경우 최대로 검색가능한 일자를 넣어준다
		 var date = new Date();
		 $("#search-end-date").val(date.getFullYear() + "-" + (date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()));
	}

	//날짜 유효성 체크
	if ( ($("#search-begin-date").val()!='' && $("#search-end-date").val()!='') && !diffDate($("#search-begin-date").val(), $("#search-end-date").val())) {
		alert("검색기간 - 시작일은 종료일보다 클 수 없습니다.");
		return false;
	}

	return true;
}

function getObjectKeyValue (chartBodyId, sessionStorageKey) {
	/*console.log("typeof key = " + typeof key);
	console.log("key = " + key);

	var data = JSON.parse(sessionStorage.getItem(sessionStorageKey));
	var returnData;
	for(var i in data){
	    if (i === key) {

	    	console.log("typeof i = " + typeof i);
	    	console.log("i = " + i);
	    	console.log("data[i] = " + data[i]);
		    returnData = data[i];
		    console.log("returnData = " + returnData);
        }
  	}
	return returnData;*/
	/*var temp2;
	var temp3;
	var temp4;
	var temp5;
	console.log("sessionStorage.getItem(sessionStorageKey) = " + sessionStorage.getItem(sessionStorageKey));
	if (sessionStorage.getItem(sessionStorageKey) !== null && sessionStorage.getItem(sessionStorageKey) !== "" && sessionStorage.getItem(sessionStorageKey) !== undefined && !jQuery.isEmptyObject(sessionStorage.getItem(sessionStorageKey) )) {
	temp2 = JSON.parse(sessionStorage.getItem(sessionStorageKey));
    //console.log("temp2['chart-body2'] = " + temp2["chart-body2"]);
    temp3 = JSON.stringify(temp2[chartBodyId]);
    temp4 = JSON.parse(temp3);
    //console.log("temp4 = " + temp4);
    //console.log("typeof temp4 = " + typeof temp4);
    temp5 = JSON.parse(temp4);
    //console.log("typeof temp5 = " + typeof temp5);
    //console.log("temp5 = " + temp5);
    //console.log("temp5.chart-body2 = " + temp5.chart-body2);
    //console.log("temp5['chartbody2'] = " + temp5["chartbody2"]);
	}
    return temp5[chartBodyId];*/
}

function setKeyData(chartId, sessionStorageKey, inputData) {
	/*var data = {};
	data[chartId] = JSON.stringify(inputData);
	//console.log("networkNewsResultArray data = " + JSON.stringify(data));
	sessionStorage.setItem(sessionStorageKey, JSON.stringify(data));*/

	var data = {};
	data[chartId.replace("-", "")] = JSON.stringify(inputData);
	//data[chartId] = JSON.stringify(inputData);

	var beforeData = {};
	//console.log(sessionStorageKey + " = " + sessionStorage.getItem(sessionStorageKey));
	beforeData = JSON.parse(sessionStorage.getItem(sessionStorageKey));
    //console.log("beforeData = " + beforeData);
    if (beforeData !== null && beforeData !== "" && beforeData !== undefined) {
    	beforeData[chartId] = JSON.stringify(data);
    	sessionStorage.setItem(sessionStorageKey, JSON.stringify(beforeData));
    } else {
    	sessionStorage.setItem(sessionStorageKey, JSON.stringify(data));
    }

	/*if (chartId !== null && chartId !== "" && chartId !== undefined && sessionStorageKey !== null) {
		var data = {};
		data[chartId] = JSON.stringify(inputData);
		////console.log("networkNewsResultArray data = " + JSON.stringify(data));
		//console.log("sessionStorage.getItem(sessionStorageKey) = " + sessionStorage.getItem(sessionStorageKey));
		var beforeData = JSON.parse(sessionStorage.getItem(sessionStorageKey));
        if (jQuery.isEmptyObject(data)) {
        } else {
        	if (sessionStorageKey === "networkSelectedTypesArray") {
        		//console.log("networkSelectedTypesArray chartId = " + chartId);
        		//console.log("networkSelectedTypesArray data = " + JSON.stringify(data));
        		//beforeData[chartId] = data;
        		data;
        	} else {
        		beforeData[chartId] = JSON.stringify(data);
        	}
        }
		//console.log(chartId + ": " + sessionStorageKey + ": " + "beforeData = " + JSON.stringify(beforeData));
		var beforeData = sessionStorage.getItem(sessionStorageKey);
		beforeData[chartId].push(inputData);
		//console.log("beforeData = " + beforeData);
		sessionStorage.setItem(sessionStorageKey, JSON.stringify(beforeData));
    }*/
}

//뉴스 검색결과 20,000건까지만 제공한다는 안내문구 출력
function getNewsLimitDivText(){
	var html ='';
	html += '<div id="news-results-alert" class="maximum-news-alert text-center mt-3">'
	html += '빅카인즈는 원활한 서비스 제공을 위해 검색결과를 <b>20,000건</b>까지 제공합니다.<br/>'
	html += '기간, 언론사 등 검색조건을 조정해서 다시 검색해주세요.'
	html += '</div>';
	return html;
}

//개인정보 재동의 대상자 확인
function checkInfoAgreeModal(data){
	var flag = false;
	var today = new Date();
	var infoAgreeYn = data.infoAgreeYn; //재동의 여부
	var alertStartDate = null;
	var expireDate = null;
	
	if(infoAgreeYn == "N"){
		//가입 후 처음 재동의하는 회원인 경우, 가입일 사용
	//	alertStartDate = new Date(Number(data.registDt));
		alertStartDate = new Date(data.registDt);
	}else{
		//기존에 재동의했던 회원인 경우, 재동의일 사용
	//	alertStartDate = new Date(Number(data.infoAgreeDate));
		alertStartDate = new Date(data.infoAgreeDate);
	}
	//((가입일/재동의일)+2년)이 되기 1개월전부터 사용자에게 안내(재동의 메일발송과 동일하게 진행) 
	alertStartDate.setYear(alertStartDate.getFullYear()+2);
	expireDate = new Date(alertStartDate.getTime()); //자동탈퇴 안내일(재동의 메일발송과 동일하게 진행)
	alertStartDate.setMonth(alertStartDate.getMonth()-1);
	
	if(alertStartDate <= today){
		flag = true;
		var text = expireDate.getFullYear()+"년 "+(expireDate.getMonth()+1)+"월 "+expireDate.getDate()+"일";
		$("#info_agree_userId").text(data.userId);
		$("#info_agree_expireDate").text(text);
	}
	
	return flag;
}

//개인정보 취급 재동의 모달창 닫으면, 해당 세션에서는 모달이 다시 출력되지 않도록 쿠키에 값 저장
function closeInfoAgreeModal(){
	Cookies.set("closeInfoAgreeModal", "Y");
	Cookies.remove("pageType");
}

/*
 * 만 14세 미만인지 확인
 * 만 14세 미만이면 return true
 */
function isChild(birthDate){
	var today = new Date();
	var yyyy = today.getFullYear();
	var mm = today.getMonth()+1;
	mm = mm < 10 ? "0"+mm : mm;
	
	var dd = today.getDate();
	dd = dd < 10 ? "0"+dd : dd;
	
	return parseInt(yyyy+mm+dd) - parseInt(birthDate) - 140000 < 0;
	
}

//다운로드 로그 등록
function downloadLogging(download_category){
	$.ajax({
		url: "/api/news/downloadLogging.do",
		method: "POST",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		data: { categoryCode: download_category},
		dataType: "json",
		success: function(data) {
			//console.log(data);
		}
	});
}

//개체명 속성 코드 명칭 조회 
function getTypeName(code){
	var typeMap = new Map();
    typeMap.set("PS", "인물");
    typeMap.set("LC", "장소");
    typeMap.set("OG", "기관");
    typeMap.set("PR", "상품");
    typeMap.set("CP", "기업");
    typeMap.set("EV", "사건");
    typeMap.set("PL", "정책");
    typeMap.set("OC", "직위");
    typeMap.set("QT", "수량");
    typeMap.set("DT", "날짜");
    typeMap.set("TI", "시간");
    typeMap.set("ROOT", "검색어");
    typeMap.set("KEYWORD", "키워드");
    typeMap.set("PERSON", "인물");
    typeMap.set("LOCATION", "장소");
    typeMap.set("ORGNIZATION", "기관");
    typeMap.set("PRODUCT", "상품");
    typeMap.set("COMPANY", "기업");
    typeMap.set("EVENT", "사건");
    typeMap.set("POLICY", "정책");
    typeMap.set("OCCUPATION", "직위");
    typeMap.set("QUANTITY", "수량");
    typeMap.set("DATE", "날짜");
    typeMap.set("TIME", "시간");
    
    var rst = typeMap.get(code);
    if(rst == null || rst == undefined){
    	rst = code;
    }
    
    return rst;
}

//URL에서 파라미터 값 조회
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.href);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, '    '));
};

//특정 검색어에 대한 강제 치환처리
function replaceSpecificKeyword(keyword){
	var keyMap = new Map();
	keyMap.set("코로나", "(코로나 OR 코로나19)");
	keyMap.set("(코로나)", "(코로나 OR 코로나19)");
	
	var result = keyword;
	if(keyMap.has(keyword)){
		result = keyMap.get(keyword);
	}
	
	return result;
}

//데이터 다운로드 체크
//countElement에 데이터 건수 값이 존재하는지 확인하여 limit 초과 시 confirm 출력
function checkDownloadFlag(countElement, confirmMsg){
	var limit = 20000;
	var flag = false;
	var count = Number(countElement) || Number($(countElement).val().replace(/,/g, '')) || Number($(countElement).text().replace(/,/g, ''));
	
	if(!isNaN(count)){
		if(count <= limit){
			flag = true;
		}else{
			flag = confirm(confirmMsg);
		}
	}
	
	return flag;
}

//뉴스 상세보기 모달 하단에 표시할 이전 글, 다음 글 정보 조회
function setPrevNextNews(newsId, currentNewsDetail){
	$target = null;
	if(location.pathname.startsWith("/v2/news/search.do") || location.pathname.startsWith("/v2/news/index.do")){
    	if($("#news-results-tab").hasClass("active")){
    		$target = $(".news-item[data-id='"+ newsId +"']");
    		//이전 글 정보
    		currentNewsDetail.prevNewsId = $target.closest(".news-item").prev().data("id");
    		currentNewsDetail.prevNewsTitle = $target.closest(".news-item").prev().find(".title-elipsis").text();
    		//다음 글 정보
    		currentNewsDetail.nextNewsId = $target.closest(".news-item").next().data("id");
    		currentNewsDetail.nextNewsTitle = $target.closest(".news-item").next().find(".title-elipsis").text();
    		
    	}else if($("#quotation-results-tab").hasClass("active")){
    		
    		$target = $(".news-item.quotation-item[data-id='"+ newsId +"']");
    		//이전 글 정보
    		currentNewsDetail.prevNewsId = $target.closest(".news-item").prev().data("newsid");
    		currentNewsDetail.prevNewsTitle = $target.closest(".news-item").prev().find(".title-elipsis").text();
    		//다음 글 정보
    		currentNewsDetail.nextNewsId = $target.closest(".news-item").next().data("newsid");
    		currentNewsDetail.nextNewsTitle = $target.closest(".news-item").next().find(".title-elipsis").text();
    		
    	}else if($("#editorial-results-tab").hasClass("active")){
    		$target = $(".news-item[data-id='"+ newsId +"']");
    		//이전 글 정보
    		currentNewsDetail.prevNewsId = $target.closest(".news-item").prev().data("id");
    		currentNewsDetail.prevNewsTitle = $target.closest(".news-item").prev().find(".title-elipsis").text();
    		//다음 글 정보
    		currentNewsDetail.nextNewsId = $target.closest(".news-item").next().data("id");
    		currentNewsDetail.nextNewsTitle = $target.closest(".news-item").next().find(".title-elipsis").text();
    	}
    }else if(location.pathname == "/"){
    	$aTags = $("#issues-contents-wrap .content-link-title").not(".link.btm");
    	
    	//언론사별 뉴스 활성화 상태인 경우
    	if($("div .item2.active").length > 0){
    		$aTags = $("#issue-providers-contents-wrap .content-link-title").not(".link.btm");
    	}
    	
    	targetIdx = null;
    	$.each($aTags, function(i, v){
    		if($(v).data('newsid') == newsId){
    			targetIdx = $aTags.index($(v));
    			$target = $aTags[$aTags.index($(v))];
    			return false;
    		}
    	});
    	
    	if(targetIdx == 0){ 
    		//첫 뉴스 선택
    		//다음 글 정보
    		currentNewsDetail.nextNewsId = $($aTags[targetIdx+1]).data("newsid");
    		currentNewsDetail.nextNewsTitle = $($aTags[targetIdx+1]).find(".title").text();
    	}else if(targetIdx > 0 && targetIdx == $aTags.length -1){
    		//마지막 뉴스 선택
    		//이전 글 정보
    		currentNewsDetail.prevNewsId = $($aTags[targetIdx-1]).data("newsid");
    		currentNewsDetail.prevNewsTitle = $($aTags[targetIdx-1]).find(".title").text();
    	}else if(targetIdx > 0){
    		//중간 뉴스 선택
    		//이전 글 정보
    		currentNewsDetail.prevNewsId = $($aTags[targetIdx-1]).data("newsid");
    		currentNewsDetail.prevNewsTitle = $($aTags[targetIdx-1]).find(".title").text();
    		//다음 글 정보
    		currentNewsDetail.nextNewsId = $($aTags[targetIdx+1]).data("newsid");
    		currentNewsDetail.nextNewsTitle = $($aTags[targetIdx+1]).find(".title").text();
    	}
    }else if(location.pathname.startsWith("/v2/news/recentNews.do")){
    	$target = $("a.news-detail[data-newsid='"+ newsId +"']");
    	
    	//console.log($target);
    	
    	//이전 글 정보
    	if($target.closest(".news-item").prev().find("a.news-detail").data("newsid") != undefined){
    		currentNewsDetail.prevNewsId = $target.closest(".news-item").prev().find("a.news-detail").data("newsid");
    		currentNewsDetail.prevNewsTitle = $target.closest(".news-item").prev().find(".title").text();
    	}
		//다음 글 정보
    	if($target.closest(".news-item").next().find("a.news-detail").data("newsid") != undefined){
    		currentNewsDetail.nextNewsId = $target.closest(".news-item").next().find("a.news-detail").data("newsid");
    		currentNewsDetail.nextNewsTitle = $target.closest(".news-item").next().find(".title").text();
    	}
    }else if(location.pathname.startsWith("/v2/mypage/myKeyword.do") || location.pathname.startsWith("/v2/mypage/myScrap.do")){
    	$target = $("h4.title[data-newsid='"+ newsId +"']")
    	
    	//console.log($target);
    	
    	//이전 글 정보
    	if($target.closest("li").prev().find("h4.title").data("newsid") != undefined){
    		currentNewsDetail.prevNewsId = $target.closest("li").prev().find("h4.title").data("newsid");
    		currentNewsDetail.prevNewsTitle = $target.closest("li").prev().find("h4.title").text().trim();
    	}
		//다음 글 정보
    	if($target.closest("li").next().find("h4.title").data("newsid") != undefined){
    		currentNewsDetail.nextNewsId = $target.closest("li").next().find("h4.title").data("newsid");
    		currentNewsDetail.nextNewsTitle = $target.closest("li").next().find("h4.title").text().trim();
    	}
    }else if(location.pathname.startsWith("/v2/mypage/myRecent.do")){
    	$target = $(".text.news-detail[data-newsid='"+ newsId +"']")
    	
    	//console.log($target);
    	
    	//이전 글 정보
    	if($target.closest("li").prev().find(".text.news-detail").data("newsid") != undefined){
    		currentNewsDetail.prevNewsId = $target.closest("li").prev().find(".text.news-detail").data("newsid");
    		currentNewsDetail.prevNewsTitle = $target.closest("li").prev().find("h4.title").text().trim();
    	}
		//다음 글 정보
    	if($target.closest("li").next().find(".text.news-detail").data("newsid") != undefined){
    		currentNewsDetail.nextNewsId = $target.closest("li").next().find(".text.news-detail").data("newsid");
    		currentNewsDetail.nextNewsTitle = $target.closest("li").next().find("h4.title").text().trim();
    	}
    }
	
	return currentNewsDetail;
}