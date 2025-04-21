Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
    lvalue = parseInt(lvalue);
    rvalue = parseInt(rvalue);

    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
});

Handlebars.registerHelper('toLocaleString', function(number) {
    return number.toLocaleString();
});

Handlebars.registerHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
});

Handlebars.registerHelper('for', function(from, to, incr, block) {
    var accum = '';
    for(var i = from; i <= to; i += incr)
        accum += block.fn(i);
    return accum;
});

Handlebars.registerHelper('eachInMap', function ( map, block ) {
    var out = '';
    Object.keys( map ).map(function( prop ) {
        out += block.fn( {key: prop, value: map[ prop ]} );
    });
    return out;
} );

Handlebars.registerHelper('indexOf', function(context,ndx) {
    return context.indexOf(ndx);
});

Handlebars.registerHelper('getValueInObj', function(obj, index, key) {
    if (obj[index]) {
        return obj[index][key];
    }

    return null;
});

Handlebars.registerHelper('formatDate', function(obj) {
    if (obj && obj.length == 8) {
        return obj.substr(0, 4) + "-" + obj.substr(4, 2) + "-" + obj.substr(6, 2);
    }

    return obj;
});

Handlebars.registerHelper('formatTime', function(obj) {
    return obj.format("HH:mm");
});

Handlebars.registerHelper('convertDate', function(date) {
   return moment(date).format("YYYY-MM-DD");
});

var pageLimit; //next 버튼 처리시 limit 값을 참조하기 위해 사용
Handlebars.registerHelper('paginate', function(pagination, options) {
    var type = options.hash.type || 'middle';
    var ret = '';
    var pageCount = Number(pagination.pageCount);
    var page = Number(pagination.page);
    var limit;
    if (options.hash.limit) limit = +options.hash.limit;

    //page pageCount
    var newContext = {};
    switch (type) {
        case 'middle':
            if (typeof limit === 'number') {
            	pageLimit = limit; //next 버튼 처리시 limit 값을 참조하기 위해 사용
                var i = 0;
                var leftCount = Math.ceil(limit / 2) - 1;
                var rightCount = limit - leftCount - 1;
                if (page + rightCount > pageCount)
                    leftCount = limit - (pageCount - page) - 1;
                if (page - leftCount < 1)
                    leftCount = page - 1;
                var start = page - leftCount;
                start = parseInt((page-1)/limit)*limit+1; //시작 페이지 값 재설정
                
                while (i < limit && i < pageCount) {
                	if(start <= pageCount){
	                	newContext = { n: start };
	                	if (start === page) newContext.active = true;
	                	ret = ret + options.fn(newContext);
	                	start++;
	                	i++;
                	}else{
                		break;
                	}
                }
            }
            else {
                for (var i = 1; i <= pageCount; i++) {
                    newContext = { n: i };
                    if (i === page) newContext.active = true;
                    ret = ret + options.fn(newContext);
                }
            }
            break;
        case 'previous':
        	/*
            if (page === 1) {
                newContext = { disabled: true, n: 1 }
            }
            else {
                newContext = { n: page - 1 }
            }
            ret = ret + options.fn(newContext);
            */
            if (page === 1) {
            	newContext = { disabled: true, n: 1 }
            }else if(page-pageLimit < 1){
            	newContext = { disabled: false, n: 1 }
            }
            else {
            	//'이전' 버튼 클릭시 이전 페이지 세트의 첫번째 페이지로 이동
            	//var prevPageNum = (parseInt((page-1)/pageLimit)-1)*pageLimit+1;
            	
            	//'이전' 버튼 클릭시 이전 페이지 세트의 마지막 페이지로 이동하도록 수정
            	var prevPageNum = (parseInt((page-1)/pageLimit)-1)*pageLimit+pageLimit;
            	newContext = { n: prevPageNum }
            }
            ret = ret + options.fn(newContext);
            break;
        case 'next':
            newContext = {};
            /*
            if (page === pageCount) {
                newContext = { disabled: true, n: pageCount }
            }
            else {
                newContext = { n: page + 1 }
            }
            */
            //현재 페이지 2, 페이지 limit 10인 상태에서 '다음' 페이지 누른 경우, 11페이지로 이동하도록 수정
            if (page === pageCount) {
            	newContext = { disabled: true, n: pageCount }
            }else if(page+pageLimit > pageCount){
            	newContext = { disabled: false, n: pageCount }
            }
            else {
            	var nextPageNum = (parseInt((page-1)/pageLimit)+1)*pageLimit+1;
            	newContext = { n: nextPageNum }
            }
            ret = ret + options.fn(newContext);
            break;
        case 'first':
            if (page === 1) {
                newContext = { disabled: true, n: 1 }
            }
            else {
                newContext = { n: 1 }
            }
            ret = ret + options.fn(newContext);
            break;
        case 'last':
            if (page === pageCount) {
                newContext = { disabled: true, n: pageCount }
            }
            else {
                newContext = { n: pageCount }
            }
            ret = ret + options.fn(newContext);
            break;
    }

    return ret;
});

Handlebars.registerHelper('addCommas', function(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
});

Handlebars.registerHelper('assign', function (varName, varValue, options) {
    if (!options.data.root) {
        options.data.root = {};
    }
    options.data.root[varName] = varValue;
});

Handlebars.registerHelper('replaceNewLines', function(str) {
   var newStr = str.replace(/\n/g, " ");
   return newStr;
});

Handlebars.getTemplate = function(name) {
	if (_contextPath !== undefined) _contextPath = _contextPath.replace('http://', 'https://');
    if (Handlebars.templates === undefined || Handlebars.templates[name] === undefined) {
        $.ajax({
            beforeSend: function (xhr, settings) {
                xhr.setRequestHeader("Accept","*/*");
				if (settings.url && !settings.url.includes('bigkindsAi/undefined/')) {
					settings.url = settings.url.replace("undefined/", "./../../");
				}
            },
            dataType: "text",
            url : _contextPath + '/js/handlebars/' + name + '.hbs?_=' + new Date().getTime(),
            success : function(data) {
                if (Handlebars.templates === undefined) {
                    Handlebars.templates = {};
                }
                Handlebars.templates[name] = Handlebars.compile(data);
            },
            async : false
        });
    }
    return Handlebars.templates[name];
};

Handlebars.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

Handlebars.registerHelper('inc', function(page, index, opts) {
    return parseInt(page) - parseInt(index);
});

Handlebars.registerHelper('getBg', function(varValue, opts) {
	if(varValue ==  "line" || varValue == "line-chart"){
		return "lineChart";
	}else if(varValue ==  "column" || varValue == "column-rotate"){
		return "barChart";
	}else if(varValue ==  "area"){
		return "areaChart";
	}else if(varValue ==  "cloud"){
		return "wordcloudChart";
	}else if(varValue ==  null || varValue == ""){
		return "wordcloudChart";
	}else{
		return varValue;
	}
});

Handlebars.registerHelper('analysisCate', function(varValue, opts) {
	if(varValue ==  null || varValue == ""){
		return "전체";
	}else{
		return varValue;
	}
});

//escapeXml
Handlebars.registerHelper('html_decoder', function(text) {
	var str = unescape(text).replace(/&amp;/g, '&');

	var div = document.createElement('div');
	div.innerHTML = str;
	return div.firstChild.nodeValue;
});

Handlebars.registerHelper('getKeywordLabel', function(obj) {
	return obj.substr(1, obj.length-2);
});

//http protocol check and set
Handlebars.registerHelper('setUrlProtocol', function(url) {
	String.prototype.startsWith = function(str) {
		if (this.length < str.length) { return false; }
		return this.indexOf(str) == 0;
	}
			
	var temp = url;
	if(!temp.startsWith("http://") && !temp.startsWith("https://")){
		temp = "http://"+url;
	}
	return temp;
})
