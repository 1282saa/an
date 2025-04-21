/**
 * 
 */
/*채팅 복사하기 */
$(document).on('click', '.btn_copy', function() {
	// 근처에 있는 .answer_cont 내의 텍스트를 가져와서 선택하고 복사
	let textToCopy = $(this).closest('.chat-1as').find('.as-list div').text();

	// 새로운 textarea 요소를 생성하고 텍스트를 설정합니다.
	let $temp = $('<textarea>');
	$temp.val(textToCopy);

	// body에 추가하고 선택한 후 복사 명령을 실행합니다.
	$('body').append($temp);
	$temp[0].select();
	document.execCommand('copy');

	// 생성한 임시 요소를 제거합니다.
	$temp.remove();
	Swal.fire(
		'텍스트가 복사되었습니다.',
		'',
		'success'
	)

});

/*대화리스트 제목변경*/
$(document).on('click', '.rclt-detail .btn_modify', function() {
	let titleTxt = $(this).parent().prev().children().text();
	$(this).parent().prev().remove();
	$(this).parent().parent().prepend("<label for='chat_title_modify' class='blind'></label><input type'text' id='chat_title_modify' class='chat_title_input_modify' spellcheck='false' value='" + titleTxt + "'>")
	$(this).parent().css({ 'display': 'none' })
	let id = $(this).data('seq');
	$('.chat_title_input_modify').keydown(function(e) {
		if (e.keyCode == 13) {
			let titleTxt = $(this).val();
			
			let $li_jsp = "";
			$li_jsp += `		<div href="javascript:void(0)" class="rclt-item" onclick="chatView(this)" data-data="` + id + `">`;
			$li_jsp += `			<a href="javascript:void(0)" class="data-item f-sb">`;
			$li_jsp += `				<p>` + titleTxt + `</p>`;
			$li_jsp += `			</a>`;
			$li_jsp += `			<div class="dm-list">`;
			$li_jsp += `				<button class="ch-name-btn f-center br-min speech-btn btn_modify" data-seq="`+id+`" data-tooltip="제목 변경">`;
			$li_jsp += `					<img src="../kindsAiAssets_2024/images/icon/change_name.svg" alt="">`;
			$li_jsp += `				</button>`;
			$li_jsp += `				<button type="button" class="del-btn f-center br-min speech-btn btn_trash chat_list_del" data-data="` + id + `" data-tooltip="삭제">`;
			$li_jsp += `					<img src="../kindsAiAssets_2024/images/icon/delete.svg" alt="">`;
			$li_jsp += `				</button>`;
			$li_jsp += `			</div>`;
			$li_jsp += `		</div>`;
			$(this).parent().prepend($li_jsp);
									
			$(this).parent().find('.btn_line').css({ 'display': 'block' })
			$(this).prev().remove();
			$(this).remove();
			let data = {
				"id": id,
				"title": titleTxt
			};
			$.ajax({
				type: "POST",
				sync: false,
				url: "/bigkindsAi/titleUpdate.do",
				contentType: "application/json",
				data: JSON.stringify(data),
				beforeSend : function(request) {
					request.setRequestHeader('ajax', 'true');
				}
			})
			.done(function(data) {

			});
		}
	})
});

/*sweetAlert modal*/
$(document).on('click', '.chat_list_del', function() {
	Swal.fire(
		{
			title: "정말 삭제 하시겠습니까?",
			text: "다시 되돌릴 수 없습니다.",
			icon: 'warning',
			showCancelButton: true, // cancel버튼 보이기. 기본은 원래 없음
			confirmButtonColor: '#3085d6', // confrim 버튼 색깔 지정
			cancelButtonColor: '#d33', // cancel 버튼 색깔 지정
			confirmButtonText: '네', // confirm 버튼 텍스트 지정
			cancelButtonText: '아니오', // cancel 버튼 텍스트 지정                
			reverseButtons: false, // 버튼 순서 거꾸로
		}).then((result) => {
			//만약 Promise 리턴을 받으면,
			if (result.isConfirmed) { // 만약 모달창에서 confirm 버튼을 눌렀다면
				var data = { "id": $(this).data('data') };
				$.ajax({
					type: "POST",
					//       async: false ,
					sync: false,
					url: "delete.do",
					contentType: "application/json",
					data: JSON.stringify(data),
					//       dataType : "json"
					beforeSend : function(request) {
						request.setRequestHeader('ajax', 'true');
					}
				})
					.done(function(data) {
						$('#chatRechatBtn').hide();
						$('.rclt-item.on').remove();
						Swal.fire(
							'삭제 되었습니다.',
							'',
							'success'
						)
						$('#thisChatType').val('main');
						mainCont();

					});

			}
		})
})

function rclt_detail(title, uuid, type) {
	var $li_jsp = ``;
	let on = (type == 'new') ? `on`:``;
	$li_jsp += `		<div href="javascript:void(0)" class="rclt-item ` + on + `" onclick="chatView(this)" data-data="` + uuid + `">`;
	$li_jsp += `			<a href="javascript:void(0)" class="data-item f-sb">`;
	$li_jsp += `				<p>` + title + `</p>`;
	$li_jsp += `			</a>`;
	$li_jsp += `			<div class="dm-list">`;
	$li_jsp += `				<button class="ch-name-btn f-center br-min speech-btn btn_modify" data-tooltip="제목 변경">`;
	$li_jsp += `					<img src="../kindsAiAssets_2024/images/icon/change_name.svg" alt="">`;
	$li_jsp += `				</button>`;
	$li_jsp += `				<button type="button" class="del-btn f-center br-min speech-btn btn_trash chat_list_del" data-data="` + uuid + `" data-tooltip="삭제">`;
	$li_jsp += `					<img src="../kindsAiAssets_2024/images/icon/delete.svg" alt="">`;
	$li_jsp += `				</button>`;
	$li_jsp += `			</div>`;
	$li_jsp += `		</div>`;
	$('.rclt-detail').prepend($li_jsp);
}


/*왼쪽 메뉴바 리스트 선택시*/
function leftMenu() {
	$('.rclt-detail .rclt-item').on('click', function() {
		$(this).parent().find('.rclt-item').removeClass('on');
		$(this).addClass('on');
	})
}

function mainCont() {
	/*
	$('.layout_content').find('.chatbot-con').remove();
	$('.divHidden').hide();
	$('.layout_content').find('.home_wrap').remove();
	$('.layout_content').prepend(`<div class="home_wrap">
        <div class="inner">
            <h2 class="logo2"><span class="blind">KINDS AI</span></h2>
            <p class="slogan">질문에 답하고 원하는 기사를 찾아주는<br>
            <span class="highlight"><span>생성형 인공지능 서비스</span></span></p>
            <ul class="recommend_chat">
                
            </ul>
        </div>
    </div>`);
	$('.relation_chat').remove();
	setTimeout(() => {
		$('.home_wrap .inner').addClass('on');
		question();
	}, 100);
	*/
	// new
	$('.chat-main-tit').hide();				// 메인 타이틀 숨기기
	$('.chatbot-con').remove();			// 챗 화면 삭제
	$('.main-tit-con').remove();			// 로고 화면 삭제
	$('.scroll-area').removeClass("on");		// 상단 영역 조절
	$('.white-gr').removeClass("on");		// 채팅 백그라운드 
	$('#chat-wrap').removeClass("on");		// 하단 영역 조절
	$('.main-wrap').prepend(
		`<div class="main-tit-con">
			<div class="character"><img src="../kindsAiAssets_2024/images/character.svg" alt=""></div>
			<div class="main-tit-wrap">
				<div class="main-logo"><img src="../kindsAiAssets_2024/images/logo.svg" alt=""></div>
				<p class="exp-txt">질문에 답하고 원하는 기사를 찾아주는 <span>생성형 인공지능 서비스</span></p>
			</div>
		</div>`
	);
	$('.function-con').show();			// 기능 영역 보이기
}

async function question() {
	var data = {};
	$.ajax({
		type: "POST",
		//       async: false ,
		sync: false,
		url: "question.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		}
	})
		.done(function(data) {
			var arr = data.questions;
			var html = ``;
			$.each(data.questions, function(i, e) {
				html += `<li>
                <button type="button" onclick="clickQuestion('`+ e + `')" class="chat_list">` + e + `</button>
            </li>`
			});
			$('.recommend_chat *').remove();
			$('.recommend_chat').append(html);

		});
}


async function chatList() {
	var data = {};
	$.ajax({
		type: "POST",
		//       async: false ,
		sync: false,
		url: "list.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		}
	})
		.done(function(data) {
			$.each(data, function(i, e) {
				rclt_detail(e.Title, e.ID, 'list');
				newChatJsp('', e.ID);
			});
			$('.divHidden').hide();

		});
}


async function createChat(createChat) {
	var data = { "title": createChat };
	$.ajax({
		type: "POST",
		async: false,
		url: "/bigkindsAi/create.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		},
		success: function(result) {
			chatID = result.chat_id;
		},
		error: function(request, status, error) {
		}
	})
}

async function updateChat(id, q) {
	var data = { "id": id, "title": q };
	$.ajax({
		type: "POST",
		async: false,
		url: "update.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		},
		success: function(result) {

		},
		error: function(request, status, error) {
		}
	})
}

function clickQuestion(q) {
	document.getElementById("conversation-input").textContent = q;
	setTimeout(function() {
		clickSubmit();
	}, 100);
}



function newChatJsp(sendMsg, uuid) {
	setSendBlock('Y');	// 채팅 입력창 비활성화
	$('#conversation-input').keyup();
	document.querySelector('.send-btn svg path').style.fill = '';
	document.getElementById('conversation-input').textContent = "";
	if (sendMsg != null && sendMsg != '') {
		$('#thisChatType').val(uuid);			// 챗 타입 지정
		$('.scroll-area').addClass("on");		// 상단 영역 조절
		$('.white-gr').addClass("on");         // 채팅 백그라운드
		$('#chat-wrap').addClass("on");		// 하단 영역 조절
		$('.chat-main-tit').show();				// 메인 타이틀 보이기
		$('.chat-main-tit').html("<h1>"+sendMsg+"</h1>");
		$('.main-tit-con').remove();			// 로고 삭제
		
		let eachProviderHtml = "";
		let kwFoot = "kw-foot";
		
		if(isFileAI == 'N') {
			eachProviderHtml = ` 
				<div class="foot-btn-wrap">
					<button type="button" class="gray-btn prm-btn eh-md-btn" style="color:#fff !important;">개별 언론사 답변 보기</button>
					<button type="button" class="gray-btn f-center other-btn">
						<img src="../kindsAiAssets_2024/images/icon/conversation.svg" alt="">
					</button>
				</div>
				`
		}
		
		if(isFileAI == 'Y') {
			kwFoot = "kw-foot2";
		}
		let titleExpTag = '';
		// if(sendMsg.length > 241) titleExpTag = '<button type="button" class="title-exp"><img src="../kindsAiAssets_2024/images/icon/bottom-arrow.svg" alt=""></button>';
		
		$('.main-wrap').prepend(`
			<div class="chatbot-con" id="` + uuid + `">
				<div class="chat-guidebox br-df">빅카인즈 AI는 인공지능을 기반으로 하므로 부정확한 정보를 제공할 수 있습니다.답변은
					한국언론진흥재단의 공식의견이 아니며 정확한 정보는 출처로 함께 제공되는 기사를 통해 확인하실 수 있습니다.</div>
				<div class="chat-1as">
					<div class="ct-as-wrap">
						<h1>` + sendMsg + titleExpTag + `</h1>
						<h2 class="ai-answer-tit">
							<div class="ai-as-ch ai-as-loading"></div>
							<span class="blink-ef">사용자의 질문을 분석하여 뉴스 데이터를 기반으로 적절한 AI 답변을 생성하고 있습니다.</span>
						</h2>
						<!-- 답변 -->
						<div class="as-list">
						</div>
					</div>
					<div class="keyword-con">
						<!-- 출처 -->
						<div class="kw-conbox">
						</div>
						<!-- 키워드 -->
						<div class="`+kwFoot+`">
						</div>
					</div>
					<!-- 다른 답변 보기영역 -->
					<div class="ch-foot">
						`+eachProviderHtml+`
					</div>
					<!-- 추천 질의 -->
					<div class="order-ch-rc">
					</div>
				</div>
			</div>
		`);
		$('.function-con').hide();
		$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
	}
	
	fnLoadingIntervalStart();
}

/** 답변 생성 **/
async function answer_append(sendMsg, uuid, each) {
	setSendBlock('Y');	// 채팅 입력창 비활성화
	$('#conversation-input').keyup();
	document.querySelector('.send-btn svg path').style.fill = '';
	document.getElementById('conversation-input').textContent = "";
	// let answerTitle = "답변";
	// if(each) answerTitle = "사용자의 질문을 분석하여 뉴스 데이터를 기반으로 적절한 AI 답변을 생성하고 있습니다.";
	let answerTitle = "사용자의 질문을 분석하여 뉴스 데이터를 기반으로 적절한 AI 답변을 생성하고 있습니다.";
	
	let eachProviderHtml = "";
	if(isFileAI == 'N') {
		eachProviderHtml = ` 
			<div class="foot-btn-wrap">
				<button type="button" class="gray-btn prm-btn eh-md-btn" style="color:#fff !important;">개별 언론사 답변 보기</button>
				<button type="button" class="gray-btn f-center other-btn">
					<img src="../kindsAiAssets_2024/images/icon/conversation.svg" alt="">
				</button>
			</div>
			`
	}
	
	let titleExpTag = '';
	let kwFoot = "kw-foot";
	// if(sendMsg.length > 241) titleExpTag = '<button type="button" class="title-exp"><img src="../kindsAiAssets_2024/images/icon/bottom-arrow.svg" alt=""></button>';
	
	if(isFileAI == 'Y') {
		kwFoot = "kw-foot2";
	}
	
	let tempTitle = sendMsg;
	if(isFileFlag) tempTitle = "주요 키워드와 관련된 뉴스를 알려드릴게요.";
	
	$('.chatbot-con').append(`
		<div class="chat-1as">
			<div class="ct-as-wrap">
				<h1>` + tempTitle + titleExpTag + `</h1>
				<h2 class="ai-answer-tit">
					<div class="ai-as-ch ai-as-loading"></div>
					<span class="blink-ef">` + answerTitle + `</span>
				</h2>
				<!-- 답변 -->
				<div class="as-list">
				</div>
			</div>
			<div class="keyword-con">
				<!-- 출처 -->
				<div class="kw-conbox">
				</div>
				<!-- 키워드 -->
				<div class="`+kwFoot+`">
				</div>
			</div>
			<!-- 다른 답변 보기 영역 -->
			<div class="ch-foot">
				`+eachProviderHtml+`
			</div>
			<!-- 추천 질의 -->
			<div class="order-ch-rc">
			</div>
		</div>
	`);
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
	
	fnLoadingIntervalStart();
	
	await sendMessage(sendMsg, each);
	
	if(isFileAI == "Y"){
		isFileAI = "N";
		sendMessage(sendMsg, each);
	}
}

function chatView(ths) {
	stopMessage();
	$('#chatRechatBtn').show();
	$('#chatStopBtn').hide();

	var id = $(ths).data('data');
	$('.rclt-detail .rclt-item').removeClass('on');
	$(ths).addClass('on');
	$('.divHidden').hide();
	$('#thisChatType').val(id);

	const pText = ths.querySelector('p').innerText;
	$('.chat-main-tit').html("<h1>"+pText+"</h1>");
		
	if ($('#' + id).length > 0) {
		$('.divHidden').hide();
		$('.layout_content').find('.home_wrap').remove();
		$('#' + id).show();
		$('#thisChatType').val(id);
	} else {
		getChatInfo(id);
	}

}

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

/*
 이전 대화 불러오기
*/
async function getChatInfo(id) {
	chatID = id;
	var data = {
		"id": id
	};
	$.ajax({
		type: "POST",
		async: false,
		url: "/bigkindsAi/getChatInfo.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		},
		success: function(result) {
			if(result[0].Filenames != null && result[0].Filenames.length > 0) isFileAI = "Y";		// 첨부된 파일이 있을 경우 파일 채팅으로 간주
			if (result.length > 0) {
				// let str = `<div id="${id}" class="chatbot-con divHidden"></div>`;
				// $('.layout_content').append(str);
				$isRealSend = "N";				// 실시간 답변이 아닐 경우
				getMessage_append(result, id);
				
			} else {
				$('#thisChatType').val('main');
				$('#chatRechatBtn').hide();
				mainCont();
			}


		},
		error: function(request, status, error) {
		}
	})
}
let historyFileName = "";		// 지난 파일 대화 이력 파일명
function getMessage_append(msg, id) {
	/*
	$('.divHidden').hide();
	$('.layout_content').find('.home_wrap').remove();
	$('#conversation-input').val('');
	*/
	// $('#thisChatType').val(uuid);			// 챗 타입 지정
	$('.scroll-area').addClass("on");		// 상단 영역 조절
	$('.white-gr').addClass("on");		// 채팅 백그라운드
	$('#chat-wrap').addClass("on");		// 하단 영역 조절
	$('.chat-main-tit').show();				// 메인 타이틀 보이기
	// $('.chat-main-tit').html("<h1>"+sendMsg+"</h1>");
	$('.main-tit-con').remove();			// 로고 삭제
	$('.chatbot-con').remove();			// 기존 대화 내용 삭제
	$('.function-con').hide();
	
	$('#conversation-input').keyup();
	document.querySelector('.send-btn svg path').style.fill = '';
	document.getElementById('conversation-input').textContent = "";

	let str = `<div class="chatbot-con" id="${id}">`;
	$('.main-wrap').append(str);
				
	msg.forEach(function(message) {
		let eachProviderHtml = "";
		if(isFileAI == 'N') {
			eachProviderHtml = ` 
				<div class="foot-btn-wrap">
					<button type="button" class="gray-btn prm-btn eh-md-btn" style="color:#fff !important;">개별 언론사 답변 보기</button>
					<button type="button" class="gray-btn f-center other-btn">
						<img src="../kindsAiAssets_2024/images/icon/conversation.svg" alt="">
					</button>
				</div>
				`
		}
		
		let titleExpTag = '';
		let kwFoot = "kw-foot";
		// let questionLength = '${message.Question}';
		// if(questionLength.length > 241) titleExpTag = '<button type="button" class="title-exp"><img src="../kindsAiAssets_2024/images/icon/bottom-arrow.svg" alt=""></button>';
		let realtedHtml = "";
		let relatedQueriesArray = message.RelatedQueries;
		if (relatedQueriesArray && relatedQueriesArray.length > 0) {
			for (let relatedQuerie of relatedQueriesArray) {
				realtedHtml += `<button type="button" onclick ="clickQuestion('${relatedQuerie}')" class="od-ch-btn">${relatedQuerie}</button>`;
			}
		}
		
		if(isFileAI == 'Y') {
			kwFoot = "kw-foot2";
		}
		
		if(message.Question == ""){
			if(message.Filenames != null && message.Filenames.length > 0){
				for (var i = 0; i < message.Filenames.length; i++) {
					historyFileName += `<div class="add-filename">`+ message.Filenames[i] +`</div>`;
				}
			}
		}else{
			$('.chatbot-con').append(`
				<div class="chat-1as">
					<div class="ct-as-wrap">
						<h1>${message.Question} `+ titleExpTag + `</h1>
						<h2 class="ai-answer-tit">
							<div class="ai-as-ch"></div>
							<span>답변</span>
						</h2>
						<!-- 답변 -->
						<div class="as-list">
						</div>
					</div>
					<div class="keyword-con">
						<!-- 출처 -->
						<div class="kw-conbox">
						</div>
						<!-- 키워드 -->
						<div class="`+kwFoot+`">
						</div>
					</div>
					<!-- 다른 답변 보기 영역 -->
					<div class="ch-foot">
						`+eachProviderHtml+`
					</div>
					<!-- 추천 질의 -->
					<div class="order-ch-rc">
						` + realtedHtml+ `
					</div>
				</div>
			`);
			
			getMessageAnswer_append(message, id);
		}
		
	});
	$('#' + id).show();
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
}

function getMessageAnswer_append(msg, id) {
	
	if(historyFileName != null && historyFileName != ""){
		const ctAsWrap = document.querySelector('.ct-as-wrap');
		const newContent = `<div class="add-fn-con">`+historyFileName+`</div>`;
		ctAsWrap.querySelector('h1').insertAdjacentHTML('afterend', newContent);
		historyFileName = "";
	}
	
	let answer;
	answer = msg.Answer ? msg.Answer : "답변이 없습니다.";
	let references = msg.References;
	let keywords = msg.Keywords;
	let msgId = msg.ID;
	let flag = false;
	let result = "";
	let temp = "";
	let refOrderIndex;
	let getReferencesChkArray = [];
	let getReferencesOrderArray = [];
	let getReferencesOrderIndex = [];
	if (references) {
		for (let i = 0; i < answer.length; i++) {
			if (flag && answer[i] === ']') { // 대괄호가 열려있는 상태에서 닫히면
				if(!isNaN(temp)) {
					const num = parseInt(temp); // temp를 숫자로 변환
					if (num >= 1 && num <= references.length) {
						refOrderIndex = getReferencesOrderIndex.indexOf(num);
						if (refOrderIndex === -1) {
						   getReferencesOrderIndex.push(num);
						   getReferencesOrderArray.push(references[num-1]);
						   refOrderIndex = getReferencesOrderArray.length - 1;
						} 
						
						if (getReferencesChkArray.indexOf(refOrderIndex) === -1) {
							getReferencesChkArray.push(refOrderIndex);
						}
						// 1~5 사이의 숫자면
						result += `<a href="javascript:referrencePop('${getReferencesOrderArray[refOrderIndex].attributes.news_id}')" class="news-link-cap">${refOrderIndex + 1}.${getReferencesOrderArray[refOrderIndex].attributes.provider}</a>`;
						temp = ''; // temp 초기화
					} else { // 아니면
						result += `[${temp}]`; // result에 추가 (출처가 아님)
					}
				} else{
					result += `[${temp}]`;
					temp = '';
				}
				flag = false; // flag 초기화
			} else if (flag) { // 대괄호가 열려있는 상태면
				temp += answer[i]; // temp에 문자열 추가
			} else if (answer[i] === '[') { // 대괄호가 열리면
				flag = true; // flag를 true로 변경
			} else if (answer.slice(i, i + 2) === '\\n') { // \n이면
				if (flag) { // 대괄호가 열려있으면
					result += `[${temp}'`; // result에 추가
					temp = ''; // temp 초기화
					flag = false; // flag 초기화
				}
				result += `</p><p>`; // result에 </p><p> 추가 (문단 구분)
				i++; // \n이므로 다음 문자는 무시
			} else {
				result += answer[i]; // result에 문자열 추가
			}
		}
	} else {
		result = answer;
	}
	
	appendMessage(id, result);
	preViewCreateKeyword(id, keywords);
	if(answer != '답변이 없습니다.'){
		preViewCreateSatisfaction(id, msgId);
	}
	preViewReferrenceGetSwiper(id, references, getReferencesChkArray, getReferencesOrderArray);
	
}

/*
	   만족도영역
*/
function preViewCreateSatisfaction(tebOnId, msgId) {

	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.ft-icon-wrap'); // 모든 '.ft-icon-wrap' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.ft-icon-wrap' 요소 선택

			/*<div class="answer_bottom_option">
				<button type="button" class="btn_positive" aria-label="만족 피드백" onclick="fn_vote('up','${msgId}')"><span class="blind">만족</span></button>
				<button type="button" class="btn_negative" aria-label="불만족 피드백" onclick="fn_vote('down','${msgId}')"><span class="blind">불만족</span></button>
				<button type="button" class="btn_copy" aria-label="복사하기"><span class="blind">복사</span></button>
			</div>*/
	$(lastBodyInnerCont).append(`
			<button type="button" class="speech-btn" data-tooltip="만족해요" onclick="fn_vote('up','${msgId}')">
				<img src="../kindsAiAssets_2024/images/icon/good.svg" alt="">
			</button>
			<button type="button" class="speech-btn" data-tooltip="아쉬워요" onclick="fn_vote('down','${msgId}')">
				<img src="../kindsAiAssets_2024/images/icon/bad.svg" alt="">
			</button>
			<button type="button" class="speech-btn copy-btn btn_copy" data-tooltip="복사하기">
				<img src="../kindsAiAssets_2024/images/icon/copy.svg" alt="">
				<img src="../kindsAiAssets_2024/images/icon/ck.svg" alt="">
			</button>
	`);
}

function preViewCreateKeyword(tebOnId, keywords) {
	if (keywords) {
		let answerArea = document.querySelector("[id='" + tebOnId + "']");
		let bodyInnerContElements = answerArea.querySelectorAll('.kw-foot'); // 모든 '.kw-foot' 요소를 선택
		if(isFileAI == 'Y') {
			bodyInnerContElements = answerArea.querySelectorAll('.kw-foot2'); // 파일 챗의 경우 class가 다름
		}
		let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.kw-foot' 요소 선택
		
		if (keywords.length > 0) {
			let liStr = "";

			for (let keyword of keywords) {
				liStr += `<button type="button" class="pg-btn ai-cre-btn chat_keyword" data-keyword='${keyword}'>${keyword}</button>`;
			}
			
			// 맨 마지막 '.body_inner'에만 콘텐츠 추가
					/*<div class="keyword_line">
						<div class="keyword_list_wrap">
							<h3 class="tit">키워드 :</h3>                            
							<ul class="keyword_list">
								${liStr}
							</ul>                                
						</div>
						<p class="info"> 키워드를 클릭하시면 하단에 관계도 분석을 보실 수 있습니다.</p>
					</div>*/
			$(lastBodyInnerCont).append(`
				<div class="kh-item1">
					<div class="f-center" style="gap: 4px;">
						<div class="exp-wrap">
							<div class="explan-hv">?</div>
							<div class="hv-tbox">키워드를 클릭하시면 하단의 관계도를<br>
								분석해 보실 수 있습니다.</div>
						</div>
						<strong>키워드</strong>
					</div>
					<div class="kw-btn-wrap">
						${liStr}
					</div>
				</div>
				<div class="kf2-item">
					<div class="kw-foot">
						<div class="relateNews gray-btn">관련뉴스 보기</div>
						<div class="ft-icon-wrap">
						</div>
					</div>
				</div>
			`);
		}
	}
}

/*
	  출처 스와이퍼 영역
*/
function preViewReferrenceGetSwiper(tebOnId, references, getReferencesChkArray, getReferencesOrderArray) {
	if (references) {
		let swiperOuterLength = $(`#${tebOnId} .kw-conbox`).length + 1;
		let answerArea = document.querySelector("[id='" + tebOnId + "']");
		let bodyInnerContElements = answerArea.querySelectorAll('.kw-conbox'); // 모든 '.kw-conbox' 요소를 선택
		let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.kw-conbox' 요소 선택
	
		// 임시 주석
		if (references.length > 0 && getReferencesChkArray.length > 0) {
		// if (references.length > 0) {
			for (let i = 0; i < references.length; i++) {
				if (getReferencesOrderArray.indexOf(references[i]) === -1) {
					getReferencesOrderArray.push(references[i]);
				}
			}
			let liStr = "";
			let publishedAtObject;

			// 년, 월, 일 추출
			let year;
			let month;
			let day;

			// 년월일 형식으로 조합
			let formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
			let refNum = 0;
			for (let reference of getReferencesOrderArray) {
				publishedAtObject = new Date(reference.attributes.published_at);
				year = publishedAtObject.getFullYear();
				day = publishedAtObject.getDate();
				month = publishedAtObject.getMonth() + 1; // 월은 0부터 시작하므로 1을 더함
				formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
				liStr += `<li class="swiper-slide">
								<a href='javascript:referrencePop("${reference.attributes.news_id}")'>
									<div class="box-head ${getReferencesChkArray.indexOf(refNum) === -1 ? 'nomal-kbox' : ''} nomal-kbox" data-provider="${reference.attributes.provider}" data-ref="${getReferencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
										<img src="../kindsAiAssets_2024/images/news-symbol1.svg" alt="">
										<strong>${reference.attributes.provider}</strong>
										<span class="${getReferencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
											${getReferencesChkArray.indexOf(refNum) === -1 ? '연관' : refNum + 1}
										</span>
									</div>
									<div class="box-txt">${reference.attributes.title}</div>
									<p class="box-date">${formattedDate}</p>
								</a>
							</li>`;
				refNum++; 
			}

			// 맨 마지막 '.body_inner'에만 콘텐츠 추가
			$(lastBodyInnerCont).append(`
				<p>출처&nbsp;<span class="num">${references.length}</span>건</p>
					<div class="swiper boxSwiper kw-conbox-${swiperOuterLength}"">
						<ol class="kw-box-flex swiper-wrapper originSwiper_${swiperOuterLength}">
							${liStr}
						</ol>
						<div class="swiper-button-next box-sw-btn box-sw-next"></div>
						<div class="swiper-button-prev box-sw-btn box-sw-prev"></div>
					</div>
			`);

			// 스와이프 함수 호출
			createOrUpdateSwiper(tebOnId, swiperOuterLength);
		}
	}
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
}


async function bigkindsAiExport() {
	// rclt-detail 클래스 안의 list on 클래스를 선택
	let divTag = document.querySelector('.rclt-detail .rclt-item.on');

	// div 태그가 존재하는지 여부를 확인하고 data-data 속성 값을 가져오기
	if (divTag) {
		let dataValue = divTag.getAttribute('data-data');
		let param = {
			"id": dataValue
		};
		$.fileDownload("/bigkindsAi/gptExport.do", {
			data: param,
			type: "POST",
			successCallback: function(data) {
				//self.$loader.hide();
			},
			failCallback: function(data) {
				// self.$loader.hide();
				Swal.fire(
					'파일다운로드에 실패했습니다.',
					'',
					'error'
				)
			}
		});
	} else {
		Swal.fire(
			'내보내기 할 대화를 선택 해주세요.',
			'',
			'info'
		)
	}
}
