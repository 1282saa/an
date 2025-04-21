if (!Array.prototype.includes) { 
    Object.defineProperty(Array.prototype, 'includes', {
        value: function(searchElement, fromIndex) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            // 1. Let O be ? ToObject(this value).
            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                // c. Increase k by 1.
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}

var formatNumber = function(num, format) {
    if (num && num.toString()) {
        var array = num.toString().split('');
        var index = -3;

        if (!format) {
            format = ',';
        }

        while (array.length + index > 0) {
            array.splice(index, 0, format);
            // Decrement by 4 since we just added another unit to the array.
            index -= 4;
        }

        return array.join('');
    } else {
        return 0;
    }
};

var checkNameForm = function(name) {
    var nameRegExp = /^[a-zA-Z \u3131-\uD79D]+$/;
    return nameRegExp.test(String(name));
}

var checkEmailForm = function(email) {
    var emailRegExp = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
    return emailRegExp.test(String(email).toLowerCase());
}

var checkPasswordForm = function(password) {
    var passwordRegExp = /^(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]/;
    return passwordRegExp.test(String(password));
}

var checkMobileForm = function(mobile) {
    var mobileRegExp = /^\d+$/;
    return mobileRegExp.test(String(mobile));
}

var checkMobileLength = function(mobile) {
    var format = false;
    if (mobile.length == 10) {
        format = true;
    } else if (mobile.length == 11) {
        format = true;
    }
    return format;
}

var checkStringByte = function(string) {
    return encodeURI(string).split(/%..|./).length - 1;
}

var lpad = function(str, padString, length) {
    while (str.length < length)
        str = padString + str;
    return str;
}

var getFormData = function($form){
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function(n, i){
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}

var hideModal = function() {
    if ($(".modal.in").length) {
        $(".modal.in").modal('hide');
    };
}

var isMobileSize = function() {
    return $("body").width() < 768;
}

var changeCount = 0;
$(document).ready(function(){
	/*
	 * 뉴스 검색 결과 영역의 데이터 변화 감지 기능 설정
	 * ajax로 뉴스 목록 데이터만 교체되는 화면이 존재하여, 
	 * 컨텐츠 변경이 있는 경우 이를 감지해 지정한 콜백 함수 실행. 
	 */
	//옵저버 인스턴스 생성 
	var observer = new MutationObserver(function(mutations) { 
		//해당 영역 내 요소에 title 속성의 텍스트 설정하도록 처리(웹접근성)
		$(".news-detail").attr("title", "팝업창이 열림");
	});
	
	var _url = document.location.href.slice(7);
	_url = _url.substr(_url.indexOf("/"), _url.length);
	
	//if(changeCount == 1 && (mutations[0].target.id == "depthAnal-news-results" || mutations[0].target.id == "newsTab01-news-results")){
	//페이지 진입 시 2번의 검색이 이루어지는 경우, 검색 카운트 감소 처리 
	if(changeCount == 0 && (_url.indexOf("/v2/depthAnalysis/assembly/") > -1 || _url.indexOf("/depthAnalComView.do") > -1)){
		changeCount = -1;
	}
	var observer_webLog = new MutationObserver(function(mutations) { 
		//웹서비스 로그 추가
		var flag = false;
		$.each(mutations, function(i,v){
			if(v.addedNodes.length > 0){
				flag = true;
			}
		});
		
		if(flag && changeCount > 0){
			//var user_id = $("#user_id").val();
			/* 웹로그(DB) 처리 */
			webLogAppend();
		}
		
		if(flag){
			changeCount++;
		}
	});

	//옵션 설정 
	var config = { attributes: false, childList: true, characterData: false}; 
	
	/*
	 * 감지대상 목록 id
	 */
	//웹접근성 적용대상
	var targetList = ["news-results", "quotations-results", "editorial-results", "news-list", "relative-news-wrap", "relation-news-results"]; 
	
	//페이징 시 웹서비스로그 기록 적용대상
	var targetList_webLog = [
		"news-results"	//검색결과 - 뉴스/인용문/사설, 뉴스로 보는 코로나19 - 시도별 관련뉴스, 지역별 미세먼지 - 뉴스
		, "quotations-results"	//검색결과 - 인용문
		, "editorial-results"	//검색결과 - 사설
		, "news-list"	//시각화 보고서 생성 - 뉴스 검색 결과
		//, "relation-news-results"	//검색결과 - 연관어 분석
		, "newsList"	//남북관계 뉴스 - 추천 키워드
		, "commentList"	//남북관계 뉴스 - 각국 정상 발언
		, "expertCommentList"	//남북관계 뉴스 - 북한 전문가 발언 
		, "historyNews"	//남북관계뉴스 - 히스토리 뉴스
		, "historyComment"	//남북관계뉴스 - 히스토리 발언
		, "depthAnal-quotations-results"	//국회의원 뉴스 - 뉴스 내 인용문
		, "depthAnal-news-results"	//국회의원 뉴스 - 관련뉴스
		, "newsTab01-news-results"	//기업 뉴스 - 최신뉴스
		, "newsTab02-news-results"	//기업 뉴스 - 관련뉴스
	];
	
	//감지실행 - 웹접근성
	targetList .forEach(function(targetId){
		var target = document.getElementById(targetId);
		if(target != null){
			//감지 실행 
			observer.observe(target, config);
		}
	});
	
	//감지실행 - 웹서비스 로그
	targetList_webLog .forEach(function(targetId){
		var target = document.getElementById(targetId);
		if(target != null){
			//감지 실행 
			observer_webLog.observe(target, config);
		}
	});
	
	//감지 설정 종료(필요시 사용)
	//observer.disconnect();
});