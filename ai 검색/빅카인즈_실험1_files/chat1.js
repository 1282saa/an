
$(document).on('click', '.chat_keyword', function() {
	keyword = $(this).data('keyword');
	keywordChart(this, $(this).data('keyword'));
});

$(document).on('click', '.downloads', function() {
	let $parentDownloads = $(this);

	if (!$parentDownloads.hasClass('active')) {
		$parentDownloads.addClass('active');
		$parentDownloads.find('.rclt-item').show();
	} else {
		$parentDownloads.removeClass('active');
		$parentDownloads.find('.rclt-item').hide();
	}
});

function stopMessage() {
	abortController.abort() // 원하는 타이밍에 취소 요청 보내기

}

// 다른 답변 보기
$(document).on('click','.other-btn',function(event){
	const tempE = $(event.target).closest('.chat-1as');
	document.getElementById("conversation-input").textContent = tempE.find('h1').text();
	clickSubmit();
});

function createMessageGroup() {
	// Create a new message group div
	const messageGroupDiv = document.createElement('div');
	return messageGroupDiv;
}


/**
 * 채팅 빌송
 */
async function sendMessage(msg, each) {
	$('#chatRechatBtn').hide();
	$('#chatStopBtn').show();
	document.getElementById("conversation-input").blur();
	
	if(each) await eachSendMessage(msg);
	
	abortController = new AbortController();
	let chatId;
	referencesChkArray = [];
	$('.relation_chat').hide();
	let tebOnId = $('.rclt-item.on').data('data');
	try {
		referencesArray = [];			// 출처
		keywordsArray = [];				// 키워드
		referencesOrderIndex = [];		// 출처 번호 임시 저장용
		referencesOrderArray = [];		// 출처명 임시 저장용
		relatedQueriesArray = [];

		// chatId 정상 발급 안되었을 경우
		if (tebOnId == 'undefined') {
			returnError();
			return;
		}
		
		if(isFileUpload == "Y"){
			const result = await fnFileUpload();
			isFileUpload = "N";	// 실제 업로드 시에만 파일 업로드 하도록 
		}
		let response = await fetch("/bigkindsAi/stream.do", {
			signal: abortController.signal,
			method: 'POST',
			headers: new Headers({
				"Content-Type": "application/json",
				"Accept": "text/event-stream",
				"ajax": "true"
			}),
			body: JSON.stringify({
				"message": msg,
				"chatId": tebOnId,
				"submitCnt": submitCnt,
				"provider": selectProvider,
				"isFileAI": isFileAI			// 파일 업로드 채팅은 호출 api가 다름
			})
		});

		let getUrl = response.url;
		if(getUrl.indexOf('sso') != -1) {
			location.href=getUrl;
		}
		let reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
		let data = ""; // 데이터 누적 변수
		$isRealSend = "Y";					// 실시간 답변일 경우
		// firstStart = "Y";
		createFlag = true
		tempContents = "";
			
		while (true) {
			let { value, done } = await reader.read();
			
			if (value == '429') {
				let answerArea = document.querySelector("[id='" + tebOnId + "']");
				let answerContElements = answerArea.querySelectorAll('.chat-1as');
				let lastAnswerCont = answerContElements[answerContElements.length - 1];
				let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
				if (answerIcon) {
					fnLoadingIntervalStop();
					if(each) answerIcon.nextElementSibling.textContent = "개별 언론사 답변";
					else answerIcon.nextElementSibling.textContent = "답변";
					answerIcon.classList.remove('ai-as-loading');
					$('span.blink-ef').removeClass('blink-ef');
					setSendBlock('N');	// 채팅 입력창 활성화
				}
				
				$('#chatStopBtn').hide();
				$('#chatRechatBtn').show();
				Swal.fire(
					'질문 횟수 소진',
					'질문 횟수를 소진하여 더 이상 질문 할 수 없습니다.',
					'warning'
				)
				//토큰 횟수 체크
				fn_limitChk();
				return;
			}else if(value == 'login'){
				await Swal.fire(
					{
						title: "로그인이 필요합니다.<br>로그인 후 진행하시겠습니까?",
						text: "",
						icon: 'info',
						showCancelButton: true, // cancel버튼 보이기. 기본은 원래 없음
						confirmButtonColor: '#3085d6', // confrim 버튼 색깔 지정
						cancelButtonColor: '#d33', // cancel 버튼 색깔 지정
						confirmButtonText: '네', // confirm 버튼 텍스트 지정
						cancelButtonText: '아니오', // cancel 버튼 텍스트 지정
						reverseButtons: false, // 버튼 순서 거꾸로
					}).then((result) => {
						//만약 Promise 리턴을 받으면,
						if (result.isConfirmed) {
							window.open('/ssoLogin.do?st=bigkindsAi&chat='+chatID, '_self');
							return;
						}else{
							return;
						}
					});
			}
			if (done) {
				if(!each) referrenceSwiper(tebOnId);
				createKeyword(tebOnId);
				// isFileAI가 Y일 경우 파일질문 api 호출 후 멀티턴 api 호출을 한번 더 해야 함 (해서 만족도 및 로딩아이콘은 첫번쨰 호출시 적용 못하도록)
				if(isFileAI == "N") 
					if(!each) createSatisfaction(tebOnId, chatId);		// 파일업로드, 개별언론사 답변일 경우 최하단 만족도 조사는 출력 x
				createrelatedQueries(tebOnId);
				let answerArea = document.querySelector("[id='" + tebOnId + "']");
				let answerContElements = answerArea.querySelectorAll('.chat-1as');
				let lastAnswerCont = answerContElements[answerContElements.length - 1];
				let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
				
				if(isFileAI == "Y") await fnFileKeyword();
								
				// if(isFileAI == "N") {
					if (answerIcon) {
						fnLoadingIntervalStop();
						if(each) answerIcon.nextElementSibling.textContent = "개별 언론사 답변";
						else answerIcon.nextElementSibling.textContent = "답변";
						answerIcon.classList.remove('ai-as-loading');
						$('span.blink-ef').removeClass('blink-ef');
						setSendBlock('N');	// 채팅 입력창 활성화
					}
					$('#chatStopBtn').hide();
					$('#chatRechatBtn').show();
					document.getElementById("conversation-input").focus();
				// }
				//토큰 횟수 체크
				// 임시 주석
				//fn_limitChk();
				
				return;
			}

			let splited = value.split('\n\n');
			
			if (value.includes('404 page not found')) {
				returnError();
				return;
			}
		
			for (let chunk of splited) { // Fix: iterate over the array splited, not dValue
			
				if (chunk.startsWith("data: ")) {
					data = "";
					chunk = chunk.replace(/^data: /, "");
				}
				if (chunk.startsWith("{\"error\":")) {
					returnError();
					return;
				}


				data += chunk;
				try {
					//if (data == "[DONE]" || data == "") {
					//	continue;
					//}
					if(data != null && data != ""){
						let json = JSON.parse(data);
						let contentChk = true;						// 답변 컨텐츠 인지 체크
						
						if (!chatId && json.id) {
							chatId = json.id;
						}
	
						//키워드
						if (json.delta.keywords) {
							contentChk = false;
							for (let keyword of json.delta.keywords) {
								keywordsArray.push(keyword);
							}
						}
						//추천질문
						if (json.delta.related_queries) {
							contentChk = false;
							for (let relatedQuerie of json.delta.related_queries) {
								relatedQueriesArray.push(relatedQuerie);
							}
						}
	
						//출처
						if (json.delta.references) {
							for (let reference of json.delta.references) {
								referencesArray.push(reference.attributes);
							}
						}else{
							if(!each)
								if(contentChk) appendMessage(tebOnId, json.delta.content);
							
							
							//let content = '\r\n' + json.delta.content;
							//for (let x of content) {
							//	appendMessage(tebOnId, x);
							//}
							
							// 1글자씩 출력 하게 - 주석 처리 JSH
							//if(json.delta.content){
							//	await fn_setContent(tebOnId, json.delta.content);
							//}
						}

						data = "";
					}
				} catch (error) {
				}
			}
		}
	} catch (error) {
		referenceCloseFlag = false;
		referenceOpenFlag = false;
		referencePre = "";
		let answerArea = document.querySelector("[id='" + tebOnId + "']");
		let answerContElements = answerArea.querySelectorAll('.chat-1as');
		let lastAnswerCont = answerContElements[answerContElements.length - 1];
		let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
		if (answerIcon) {
			fnLoadingIntervalStop();
			if(each) answerIcon.nextElementSibling.textContent = "개별 언론사 답변";
			else answerIcon.nextElementSibling.textContent = "답변";
			answerIcon.classList.remove('ai-as-loading');
			$('span.blink-ef').removeClass('blink-ef');
			setSendBlock('N');	// 채팅 입력창 활성화
		}
		if(error.message.indexOf('aborted') === -1){
			appendMessage(tebOnId, '<div class="error_box">에러가 발생했습니다. 문제가 지속되면 고객센터에 문의하십시오.</div>');
		}
		
		$('#chatStopBtn').hide();
		$('#chatRechatBtn').show();
		//토큰 횟수 체큰
		fn_limitChk();
	}
}

/**
 * 개별 언론사 채팅 발송
 */
var eachReferencesArray = [];				// 개별 언론사 출처용
var eachReferencesChkArray = [];			// 
var eachReferencesOrderIndex = [];		// 개별 언론사 출처 번호 임시 저장용
var eachReferencesOrderArray = [];		// 개별 언론사 출처명 임시 저장용
async function eachSendMessage(msg) {
	abortController = new AbortController();
	let tebOnId = $('.rclt-item.on').data('data');
	let providers = selectProvider.split(',');
	document.getElementById("conversation-input").blur();

	for(let i=0; i<providers.length; i++){
		eachReferencesArray = [];				// 개별 언론사 출처용
		eachReferencesChkArray = [];			// 
		eachReferencesOrderIndex = [];		// 개별 언론사 출처 번호 임시 저장용
		eachReferencesOrderArray = [];		// 개별 언론사 출처명 임시 저장용
		try {
			let response = await fetch("/bigkindsAi/stream.do", {
				signal: abortController.signal,
				method: 'POST',
				headers: new Headers({
					"Content-Type": "application/json",
					"Accept": "text/event-stream",
					"ajax": "true"
				}),
				body: JSON.stringify({
					"message": msg,
					"chatId": tebOnId,
					"submitCnt": submitCnt,
					"provider": providers[i],
					"multi": false
				})
			});
			
			let getUrl = response.url;
			if(getUrl.indexOf('sso') != -1) {
				location.href=getUrl;
			}
			let reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
			let data = ""; // 데이터 누적 변수
			
			let newParagraph = document.createElement('div'); // 새로운 <div> 요소 생성
			newParagraph.className = "temp-class";
			let newParagraph2Provider = document.createElement('div');
			newParagraph2Provider.className = "eh-media-name";
			newParagraph2Provider.innerHTML = '<strong>'+providers[i]+'</strong>';
			newParagraph.appendChild(newParagraph2Provider);

			while (true) {
				let { value, done } = await reader.read();
				if (done) {
					eachReferrenceSwiper(tebOnId);
					document.getElementById("conversation-input").focus();
					// if(isFileAI == "N") createSatisfaction(tebOnId, chatId);
					// return;
				}
				
				let splited = value.split('\n\n');
				
				for (let chunk of splited) {
					if (chunk.startsWith("data: ")) {
						data = "";
						chunk = chunk.replace(/^data: /, "");
					}
					
					if (chunk.startsWith("{\"error\":")) {
						fnEachCreateMsg("as-detail-"+i, '\r\n' + '<div class="error_box">에러가 발생했습니다. 문제가 지속되면 고객센터에 문의하십시오.</div>');
						let answerArea = document.querySelector("[id='" + tebOnId + "']");
						let answerContElements = answerArea.querySelectorAll('.chat-1as');
						let lastAnswerCont = answerContElements[answerContElements.length - 1];
						let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
						if (answerIcon) {
							fnLoadingIntervalStop();
							answerIcon.nextElementSibling.textContent = "개별 언론사 답변";
							answerIcon.classList.remove('ai-as-loading');
							$('span.blink-ef').removeClass('blink-ef');
							setSendBlock('N');	// 채팅 입력창 활성화
						}
				
						$('#chatStopBtn').hide();
						$('#chatRechatBtn').show();
						return;
					}
					
					data += chunk;
					try {
						if(data != null && data != ""){
							let json = JSON.parse(data);
							let contentChk = true;						// 답변 컨텐츠 인지 체크
							
							//키워드
							if (json.delta.keywords) contentChk = false;
							//추천질문
							if (json.delta.related_queries) contentChk = false;
							//출처
							if (json.delta.references) {
								for (let reference of json.delta.references) {
									eachReferencesArray.push(reference.attributes);
								}
							}else{
								if(contentChk){
									let content = json.delta.content;
									let lines = content.split(/\r?\n/);
									let answerArea = document.querySelector("[id='" + tebOnId + "']");
									let answerContElements = answerArea.querySelectorAll('.as-list'); // 모든 '.as-list' 요소를 선택
									let lastAnswerCont = answerContElements[answerContElements.length - 1];
									let newParagraph2cont = document.createElement('div'); // 새로운 <div> 요소 생성
									newParagraph2cont.className = "as-detail, as-detail-"+i;

																		
									if (lines.length > 0) {
										// Loop through the lines
										for (let line of lines) {
											if (line == "") {
												newParagraph.appendChild(newParagraph2cont);
												lastAnswerCont.appendChild(newParagraph); // 새로운 <div> 요소를 마지막 '.as-list'에 추가
											}
											fnEachCreateMsg("as-detail-"+i, line, providers[i]);
										}
									} else {
										fnEachCreateMsg("as-detail-"+i, lines[0], providers[i]);
									}
								}
							}
							data = "";
						}
					} catch (error) {
					}
				}
			}
		} catch (error) {
		}
	}
}
function eachReciveMessage(answerContClass, content) {
	var divs = document.querySelectorAll('.'+answerContClass);
	var lastParagraph = divs[divs.length - 1];
	if (lastParagraph) {
		lastParagraph.innerHTML += content; // 기존 텍스트에 추가
	}
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
}
let eachReferenceOpenFlag = false;
let eachReferencePre = "";
function fnEachCreateMsg(answerContClass, line, provider) {
	let msg = line.trim();
	let receivePass = false;		// 출처 존재시 최초 receive 후 출처 영역('[') 전까지는 recevie 보내지 않기
	let providerChk = false;		// 출처 존재 여부 ('[',']')

	if(msg.includes("[") || msg.includes("]")) providerChk = true;
	for (let i = 0; i < msg.length; i++) {
		let char = msg[i];
		if(char == "[") receivePass = false;
		if(!receivePass){
			if (char == ".") {
				//referenceCloseFlag = false;
				//referenceOpenFlag = false;
				//referencePre = "";
			} else if (char == "[") {
				eachReferenceOpenFlag = true;
			} else if (eachReferenceOpenFlag && char == "]") {
				if(!isNaN(eachReferencePre)) {
					
					//배열에 출처값이 없으면 출처 넣기 (답변 내 출처 표시용)
					let refOrderIndex = eachReferencesOrderIndex.indexOf(eachReferencePre);
					if (refOrderIndex === -1) {
						eachReferencesOrderIndex.push(eachReferencePre);
						eachReferencesOrderArray.push(eachReferencesArray[eachReferencePre-1]);
						refOrderIndex = eachReferencesOrderArray.length - 1;
					}
					//배열에 출처값이 없으면 출처 넣기  (답변 내 출처 영역 출처 표시용)
					if (eachReferencesChkArray.indexOf(refOrderIndex) === -1) {
						eachReferencesChkArray.push(refOrderIndex);
					}

					let newAnchor = document.createElement('a');
					newAnchor.href = 'javascript:referrencePop("' + eachReferencesArray[eachReferencePre-1].news_id + '")';
					
					var divs = document.querySelectorAll('.'+answerContClass);
					var lastParagraph = divs[divs.length - 1];
					
					if (lastParagraph) {
						newAnchor.textContent += 1 + refOrderIndex + "." + provider; // 링크 텍스트를 설정하세요.
						newAnchor.classList.add('news-link-cap');
						lastParagraph.appendChild(newAnchor);
					}
			
				}
				eachReferencePre = "";
				eachReferenceOpenFlag = false;

			} else if (eachReferenceOpenFlag && char != "]") {
				eachReferencePre += char;
			} else {
				if(!providerChk){
					eachReciveMessage(answerContClass, line);
					break;
				}else{
					let lineTemp = line.replace(/\[\d+\]|\[\d+|\d+\]/g, '');
					if(lineTemp.includes("[") || lineTemp.includes("]")) lineTemp = lineTemp.replace("[", '').replace("]", '');
					eachReciveMessage(answerContClass, lineTemp);
					receivePass = true;
				}
			}
		}
	}
	// eachReciveMessage(answerContClass, line);
}


async function fn_setContent(tebOnId, content){
	const binaryStream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const chunk = encoder.encode('\r\n' + content); // 텍스트를 바이너리로 변환
			controller.enqueue(chunk); // 스트림에 데이터 삽입
			controller.close(); // 스트림 종료
		}
	});
	
	const textStream = binaryStream.pipeThrough(new TextDecoderStream());
	const readerTemp = textStream.getReader();
	let done, value;
	
	while (!done) {
		({ done, value } = await readerTemp.read());
		if(value != undefined){
			for (let char of value) {
				await wait(5);
				appendMessage(tebOnId, char);
			}
		}
	}
}
function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/* 1글자씩 출력 하게 - 주석 처리 JSH
function appendMessage(tebOnId, content) {
	// Split the content by '\n'
	if(content !=null && content.length > 1) content = '\r\n' + content;
	let lines = content.split(/\r?\n/);
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let answerContElements = answerArea.querySelectorAll('.as-list'); // 모든 '.as-list' 요소를 선택
	if (lines.length > 0) {
		// Loop through the lines
		for (let line of lines) {
			if (line == "") {
				let newParagraph = document.createElement('div'); // 새로운 <div> 요소 생성
				newParagraph.className = "as-detail";
				let lastAnswerCont = answerContElements[answerContElements.length - 1];
				lastAnswerCont.appendChild(newParagraph); // 새로운 <div> 요소를 마지막 '.as-list'에 추가
			}
			fnCreateMsg(answerContElements, line, tebOnId);
		}
	} else {
		fnCreateMsg(answerContElements, lines[0], tebOnId);
	}
}
*/
function appendMessage(tebOnId, content) {
	if (content.includes("|")) createFlag = false;
	// Split the content by '\n'
	if(content !=null && content.length > 1 && $isRealSend == "N") content = '\r\n' + content;		// 질문입력시와 채팅목록 내용 가져올때 데이터 형태가 다름
	let lines = content.split(/\r?\n/);
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let answerContElements = answerArea.querySelectorAll('.as-list'); // 모든 '.as-list' 요소를 선택
	if (lines.length > 0) {
		// Loop through the lines
		for (let line of lines) {
			if (line == "" && createFlag) {
				let newParagraph = document.createElement('div'); // 새로운 <p> 요소 생성
				newParagraph.className = "as-detail";
				let lastAnswerCont = answerContElements[answerContElements.length - 1];
				lastAnswerCont.appendChild(newParagraph); // 새로운 <div> 요소를 마지막 '.as-list'에 추가
			}
			
			fnCreateMsg(answerContElements, line, tebOnId);
		}
	} else {
		fnCreateMsg(answerContElements, lines[0], tebOnId);
	}
}

function reciveMessage(answerContElements, content) {
	let lastAnswerCont = answerContElements[answerContElements.length - 1]; // 마지막 '.ai-answer-tit' 요소 선택
	let lastParagraph = lastAnswerCont.querySelector('div:last-child'); // 마지막 <div> 자식 요소 선택
	if (lastParagraph) {
		lastParagraph.innerHTML += content; // 기존 텍스트에 추가
		// lastParagraph.innerHTML = tempContents;
		tempContents += content;
	}
	
	let lastParagraphContent = tempContents;
	if (lastParagraphContent.includes("||")) {													// "||" 이 있을 경우 markdown 적용
		lastParagraphContent = lastParagraphContent.replace(/\|\|/g, '|\r\n|');		// "||" 일 경우 줄바꿈 처리
		lastParagraphContent = marked.parse(lastParagraphContent);							// markdown 적용
		lastParagraph.innerHTML = lastParagraphContent.replace(/<\/?p>/g, '');		// <p></p> 제거
	}
	
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
}



function fnCreateMsg(answerContElements, line, tebOnId) {
	if (line == " ") {
		reciveMessage(answerContElements, line);
	} else {
		let msg = line.trim();
		let lastAnswerCont = answerContElements[answerContElements.length - 1]; // 마지막 '.ai-answer-tit' 요소 선택
		
		let receivePass = false;		// 출처 존재시 최초 receive 후 출처 영역('[') 전까지는 recevie 보내지 않기
		let providerChk = false;		// 출처 존재 여부 ('[',']')
		if(msg.includes("[") || msg.includes("]")) providerChk = true;
		for (let i = 0; i < msg.length; i++) {
			
			let char = msg[i];
			if(char == "[") receivePass = false;
			
			if(!receivePass){
				if (char == "") {
					let newParagraph = document.createElement('div'); // 새로운 <div> 요소 생성
					newParagraph.className = "as-detail";
					lastAnswerCont.appendChild(newParagraph); // 새로운 <p> 요소를 마지막 '.ai-answer-tit'에 추가
				} else if (referenceCloseFlag && char == ".") {
					referenceCloseFlag = false;
					referenceOpenFlag = false;
					referencePre = "";
					/*let newParagraph = document.createElement('p'); // 새로운 <p> 요소 생성
					lastAnswerCont.appendChild(newParagraph); // 새로운 <p> 요소를 마지막 '.ai-answer-tit'에 추가*/
				} else if (char == "[") {
					referenceOpenFlag = true;
				} else if (referenceOpenFlag && char == "]") {
					
					if(!isNaN(referencePre)) {
						//배열에 출처값이 없으면 출처 넣기 (답변 내 출처 표시용)
						let refOrderIndex = referencesOrderIndex.indexOf(referencePre);
						if (refOrderIndex === -1) {
							referencesOrderIndex.push(referencePre);
							referencesOrderArray.push(referencesArray[referencePre-1]);
							refOrderIndex = referencesOrderArray.length - 1;
						}
						
						//배열에 출처값이 없으면 출처 넣기 (답변 내 출처 영역 출처 표시용)
						if (referencesChkArray.indexOf(refOrderIndex) === -1) {
							referencesChkArray.push(refOrderIndex);
						}
						
						if (referencesOrderArray[refOrderIndex]) {
							// let swiperOuterLength = $(`#${tebOnId} .kw-conbox`).length + 1;
							let newAnchor = document.createElement('a');
							newAnchor.href = 'javascript:referrencePop("' + referencesOrderArray[refOrderIndex].news_id + '")';
							
							// 추가된 <div>를 선택해서 <a> 태그 생성
							let lastAnswerCont = answerContElements[answerContElements.length - 1]; // 마지막 '.ai-answer-tit' 요소 선택
							let lastParagraph = lastAnswerCont.querySelector('div:last-child'); // 마지막 <div> 자식 요소 선택
							if (lastParagraph) {
								newAnchor.textContent += refOrderIndex + 1 + "." + referencesOrderArray[refOrderIndex].provider; // 링크 텍스트를 설정하세요.
								newAnchor.classList.add('news-link-cap');
								lastParagraph.appendChild(newAnchor);
							}
						}
					}else {
						reciveMessage(answerContElements, '['+referencePre+']');
					}
					referencePre = "";
					referenceOpenFlag = false;
					// referenceCloseFlag = true; // 추가된 부분: referenceCloseFlag를 true로 설정
	
				} else if (referenceOpenFlag && char != "]") {
					referencePre += char;
				} else {
					// referenceCloseFlag = false;
					// referenceOpenFlag = false;
					// referencePre = "";
					
					if(!providerChk){
						reciveMessage(answerContElements, line);
						break;
					}else{
						let lineTemp = line.replace(/\[\d+\]|\[\d+|\d+\]/g, '');
						if(lineTemp.includes("[") || lineTemp.includes("]")) lineTemp = lineTemp.replace("[", '').replace("]", '');
						reciveMessage(answerContElements, lineTemp);
						receivePass = true;
					}
				}
			}
		}
	}
}

function createKeyword(tebOnId) {
	if (keywordsArray) {
		let answerArea = document.querySelector("[id='" + tebOnId + "']");
		let bodyInnerContElements = answerArea.querySelectorAll('.kw-foot'); // 모든 '.kw-foot' 요소를 선택
		let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.kw-foot' 요소 선택

		if (keywordsArray.length > 0) {
			let liStr = "";

			for (let keyword of keywordsArray) {
				// liStr += `<li class="chat_keyword" data-keyword='${keyword}' >${keyword}</li>`;
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
					<div class="f-center keyword_line" style="gap: 4px;">
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
				<div class="ft-icon-wrap">
				</div>
			`);
		}
	}
}
/*
	   만족도영역
*/
function createSatisfaction(tebOnId, chatId) {
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.ft-icon-wrap'); // 모든 '.ft-icon-wrap' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.ft-icon-wrap' 요소 선택

			/*<div class="answer_bottom_option">
				<button type="button" class="btn_positive" aria-label="만족 피드백" onclick="fn_vote('up','${chatId}')"><span class="blind">만족</span></button>
				<button type="button" class="btn_negative" aria-label="불만족 피드백" onclick="fn_vote('down','${chatId}')"><span class="blind">불만족</span></button>
				<button type="button" class="btn_copy" aria-label="복사하기"><span class="blind">복사</span></button>
			</div>*/
	$(lastBodyInnerCont).append(`
			<button type="button" class="speech-btn" data-tooltip="만족해요" onclick="fn_vote('up','${chatId}')">
				<img src="../kindsAiAssets_2024/images/icon/good.svg" alt="">
			</button>
			<button type="button" class="speech-btn" data-tooltip="아쉬워요" onclick="fn_vote('down','${chatId}')">
				<img src="../kindsAiAssets_2024/images/icon/bad.svg" alt="">
			</button>
			<button type="button" class="speech-btn copy-btn btn_copy" data-tooltip="복사하기">
				<img src="../kindsAiAssets_2024/images/icon/copy.svg" alt="">
				<img src="../kindsAiAssets_2024/images/icon/ck.svg" alt="">
			</button>
	`);
}
/*
	   추천 질문 영역
*/
function createrelatedQueries(tebOnId) {

	if (relatedQueriesArray.length > 0) {
		let liStr = "";

		for (let relatedQuerie of relatedQueriesArray) {
			// liStr += `<button type="button" onclick ="clickQuestion('${relatedQuerie}')" class="chat_list">${relatedQuerie}</button>`;
			liStr += `<button type="button" onclick ="clickQuestion('${relatedQuerie}')" class="od-ch-btn">${relatedQuerie}</button>`;
		}
		//let $targetElement = $(`.relation_chat[data-seq="${tebOnId}"]`);

		let answerArea = document.querySelector("[id='" + tebOnId + "']");
		let bodyInnerContElements = answerArea.querySelectorAll('.order-ch-rc'); // 모든 '.order-ch-rc' 요소를 선택
		let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.order-ch-rc' 요소 선택
	
		// 조건 충족 여부 확인
		/*if ($targetElement.length > 0) {
			$targetElement.remove();
		}
		$('.inner').append(`
				<div class="relation_chat" data-seq="${tebOnId}">
					 <div class="relation_chat_inner">
				     	${liStr}
				     </div>
				</div>
	        `);*/

		$(lastBodyInnerCont).append(`
			${liStr}
		`);
	}
}
/*
	  출처 스와이퍼 영역
*/
function referrenceSwiper(tebOnId) {
	let swiperOuterLength = $(`#${tebOnId} .kw-conbox`).length + 1;
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.kw-conbox'); // 모든 '.kw-conbox' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.kw-conbox' 요소 선택

	// 임시 주석
	// if (referencesArray.length > 0 && referencesChkArray.length > 0) {
	if (referencesArray.length > 0) {
		for (let i = 0; i < referencesArray.length; i++) {
		    if (referencesOrderArray.indexOf(referencesArray[i]) === -1) {
		        referencesOrderArray.push(referencesArray[i]);
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
		for (let reference of referencesOrderArray) {
			publishedAtObject = new Date(reference.published_at);
			year = publishedAtObject.getFullYear();
			day = publishedAtObject.getDate();
			month = publishedAtObject.getMonth() + 1; // 월은 0부터 시작하므로 1을 더함
			formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
			
			liStr += `<li class="swiper-slide">
							<a href='javascript:referrencePop("${reference.news_id}")'>
								<div class="box-head ${referencesChkArray.indexOf(refNum) === -1 ? 'nomal-kbox' : ''} nomal-kbox" data-provider="${reference.provider}" data-ref="${referencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
									<img src="../kindsAiAssets_2024/images/news-symbol1.svg" alt="">
									<strong>${reference.provider}</strong>
									<span class="${referencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
										${referencesChkArray.indexOf(refNum) === -1 ? '연관' : refNum + 1}
									</span>
								</div>
								<div class="box-txt">${reference.title}</div>
								<p class="box-date">${formattedDate}</p>
							</a>
						</li>`;
						refNum++;
}

/*
<div class="origin_wrap">
	                <p class="origin_counter">출처<span class="bold">${referencesArray.length}</span>건</p>
	            </div>
	            <div class="kw-conbox kw-conbox-${swiperOuterLength}">
	                <div class="swiper originSwiper_${swiperOuterLength}">
	                    <ul class="origin_list_wrap swiper-wrapper">
	                        ${liStr}
	                    </ul>
	                </div>
	                <div class="swiper-button-next"></div>
	                <div class="swiper-button-prev"></div>
	            </div>*/
	            
		// 맨 마지막 '.body_inner'에만 콘텐츠 추가
		$(lastBodyInnerCont).append(`
				<p>출처&nbsp;<span class="num">${referencesArray.length}</span>건</p>
				<div class="swiper boxSwiper kw-conbox-${swiperOuterLength}">
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

/*
	  출처 스와이퍼 영역
*/
function eachReferrenceSwiper(tebOnId) {
	let swiperOuterLength = $(`#${tebOnId} .temp-class`).length + 1;
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.temp-class'); // 모든 '.temp-class' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.temp-class' 요소 선택

	// if (referencesArray.length > 0 && referencesChkArray.length > 0) {
	if (eachReferencesArray.length > 0) {
		for (let i = 0; i < eachReferencesArray.length; i++) {
		    if (eachReferencesOrderArray.indexOf(eachReferencesArray[i]) === -1) {
		        eachReferencesOrderArray.push(eachReferencesArray[i]);
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
		for (let reference of eachReferencesOrderArray) {
			publishedAtObject = new Date(reference.published_at);
			year = publishedAtObject.getFullYear();
			day = publishedAtObject.getDate();
			month = publishedAtObject.getMonth() + 1; // 월은 0부터 시작하므로 1을 더함
			formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
			
			liStr += `<li class="swiper-slide">
							<a href='javascript:referrencePop("${reference.news_id}")'>
								<div class="box-head ${eachReferencesChkArray.indexOf(refNum) === -1 ? 'nomal-kbox' : ''} nomal-kbox" data-provider="${reference.provider}" data-ref="${eachReferencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
									<img src="../kindsAiAssets_2024/images/news-symbol1.svg" alt="">
									<strong>${reference.provider}</strong>
									<span class="${eachReferencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
										${eachReferencesChkArray.indexOf(refNum) === -1 ? '연관' : refNum + 1}
									</span>
								</div>
								<div class="box-txt">${reference.title}</div>
								<p class="box-date">${formattedDate}</p>
							</a>
						</li>`;
						refNum++;
		}
		
		let satisfaction = "";
		if(isFileAI == "N") satisfaction = `
			<button type="button" class="speech-btn" data-tooltip="만족해요" onclick="fn_vote('up','${tebOnId}')">
				<img src="../kindsAiAssets_2024/images/icon/good.svg" alt="">
			</button>
			<button type="button" class="speech-btn" data-tooltip="아쉬워요" onclick="fn_vote('down','${tebOnId}')">
				<img src="../kindsAiAssets_2024/images/icon/bad.svg" alt="">
			</button>
			<button type="button" class="speech-btn copy-btn btn_copy" data-tooltip="복사하기">
				<img src="../kindsAiAssets_2024/images/icon/copy.svg" alt="">
				<img src="../kindsAiAssets_2024/images/icon/ck.svg" alt="">
			</button>
		`;
		
		// 맨 마지막 '.body_inner'에만 콘텐츠 추가
		$(lastBodyInnerCont).append(`
				<div class="keyword-con">
					<div class="kw-conbox">
						<p>출처&nbsp;<span class="num">${eachReferencesArray.length}</span>건</p>
						<div class="swiper boxSwiper kw-conbox-${swiperOuterLength}" style="display: none;">
							<ol class="kw-box-flex swiper-wrapper originSwiper_${swiperOuterLength}">
								${liStr}
							</ol>
							<div class="swiper-button-next box-sw-btn box-sw-next"></div>
							<div class="swiper-button-prev box-sw-btn box-sw-prev"></div>
						</div>
					</div>
				</div>
				<div class="eh-keywrod-wrap">
					<button type="button" class="gray-btn f-center eh-ktog-btn">
						<img src="../kindsAiAssets_2024/images/icon/arrow.svg" alt="">
						<span>출처 펼치기</span>
					</button>
					<div class="ft-icon-wrap">
						${satisfaction}
					</div>
				</div>
			`);

		// 스와이프 함수 호출
		createOrUpdateSwiper(tebOnId, swiperOuterLength);
	}
}

async function createOrUpdateSwiper(tebOnId, swiperOuterLength) {
	// 이미 해당 키가 존재하는지 확인
	if (swipers.hasOwnProperty(tebOnId)) {
		// 해당 키가 존재하면 바꿔치기
		swipers[tebOnId].destroy(); // 이전 Swiper 객체 제거

	}
	/* 임시 주석
	swipers[tebOnId+swiperOuterLength] = new Swiper(`[id='${tebOnId}'] .kw-conbox-${swiperOuterLength} .originSwiper_${swiperOuterLength}`, {
		watchSlidesProgress: true,		// new
		speed: 800,		// new
		slidesPerView: 5,
		spaceBetween: 10,
		initialSlide: 0,	// new
		navigation: {
			nextEl: `.kw-conbox-${swiperOuterLength} .swiper-button-next .box-sw-btn .box-sw-next`,
			prevEl: `.kw-conbox-${swiperOuterLength} .swiper-button-prev .box-sw-btn .box-sw-next`,
		},
		breakpoints: {
			1025: {
				slidesPerView: 5,
				slidesPerGroup: 1
			},
			769: {
				slidesPerView: 3,
				slidesPerGroup: 1
			},
			480: {
				slidesPerView: 2,
				slidesPerGroup: 1
			},
			360: {
				slidesPerView: 2,
				slidesPerGroup: 1
			}
		}
	});
	*/
	swipers = new Swiper('.boxSwiper', {
        watchSlidesProgress: true,
        speed: 800,
        slidesPerView: 5,
        spaceBetween: 10,
        initialSlide: 0,
        navigation: {
            nextEl: ".box-sw-next",
            prevEl: ".box-sw-prev",
        },
        breakpoints: {
            1025: {
                slidesPerView: 5,
                slidesPerGroup: 1,
            },
            769: {
                slidesPerView: 3,
                slidesPerGroup: 1,
            },
            480: {
                slidesPerView: 2,
                slidesPerGroup: 1,
            },
            360: {
                slidesPerView: 2,
                slidesPerGroup: 1,
            },
        },
    });
	$('.scroll-area').scrollTop($('.scroll-area')[0].scrollHeight);
}
function generateRandomString(length) {
	let result = '';
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let charactersLength = characters.length;

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

/*
	  키워드 관계도 분석 차트
*/
function keywordChart(e, keyword) {

	$('.keyword-chat').remove();
	chartSeq = generateRandomString(20);
	let content = `
				<!-- 키워드 관계도 분석 -->
				<div class="keyword-chat" data-seq="${chartSeq}">
				<div class="rel-diagram-content R-open L-open">
	
					<div class="rel-control-info">
						<ul class="rel-item-wrp">
							<li>
								<button type="button" class="item item01 btn-node-type active"
									data-type="person" >
									인물
									<p id="relative-person-cnt" data-seq="${chartSeq}">0</p>
								</button>
							</li>
							<li>
								<!-- class="active" 추가시 색상 표시 -->
								<button type="button" class="item item02 btn-node-type active"
									data-type="location" >
									장소
									<p id="relative-location-cnt" data-seq="${chartSeq}">0</p>
								</button> <!-- // class="active" 추가시 색상 표시 -->
							</li>
							<li>
								<button type="button" class="item item03 btn-node-type active"
									data-type="orgnization" >
									기관
									<p id="relative-org-cnt" data-seq="${chartSeq}">0</p>
								</button>
							</li>
							<li>
								<button type="button" class="item item04 btn-node-type active"
									data-type="keyword">
									키워드
									<p id="relative-keyword-cnt"  data-seq="${chartSeq}">0</p>
								</button>
							</li>
						</ul>
						<small class="title">가중치 구조 타입</small>
						<ul class="relDgrTab">
							<li><a href="#" class="btn-tab sm active group-type-btn"
								data-type="normal">기본</a></li>
							<li><a href="#" type="button"
								class="btn-tab sm group-type-btn" data-type="provider_name">매체별</a></li>
						</ul>
						<!-- 201203 수정 -->
						<small class="title">가중치(관련기사 건수) : <strong
							id="analysis-news-cnt"  data-seq="${chartSeq}">0</strong>이상 <strong id="weightMax"  data-seq="${chartSeq}">0</strong>
							이하
						</small>
	
						<div class="rel-ctrl-input">
							<div class='ctrl pull-left mr5'>
								<div class='ctrl__button ctrl__button--decrement'>&ndash;</div>
								<div class='ctrl__counter'>
									<label for="currentWeight" class="sr-only"></label> <input
										class='ctrl__counter-input' maxlength='10' type='text'
										id="currentWeight" data-seq="${chartSeq}">
									<div class='ctrl__counter-num' style="display: none;">0</div>
								</div>
								<div class='ctrl__button ctrl__button--increment'>+</div>
							</div>
							<button class="btn btn-default btn-sm pull-left applyWeightBtn" type="button">적용</button>
						</div>
						<!-- // 201203 수정 -->
					</div>
					<!-- 201203 수정 : 툴 -->
					<div class="rel-control-acc">
						<button type="button" class="btn network-relayout-btn btn">
							<i class="icon-target"></i>
							<div class="tooltip">화면맞춤</div>
						</button>
						<button type="button" class="btn network-lock-btn" id="lock_btn">
							<i class="icon-lock"></i>
							<div class="tooltip">그래프 고정</div>
						</button>
						<button type="button" class="btn network-fullscreen-btn">
							<i class="icon-zoom"></i>
							<div class="tooltip">전체 화면</div>
						</button>
					</div>
	
	
					<!-- // 201203 수정 : 툴 -->
					<!-- 다운로드드롭다운 -->
					<div class="downloads rel-control-btn">
						<button type="button" class="btn btn-dark btn-sm btn-round02">
							다운로드 <i class="icon-download-wh"></i>
						</button>
						<div class="list">
							<a href="javascript:void(0);"
								class="network-download mobile-excel-download"
								data-type="xlsx-news"> 기사 데이터 (Excel) </a> <a
								href="javascript:void(0);"
								class="network-download mobile-excel-download" data-type="xlsx">
								그래프 데이터 (Excel) </a> <a href="javascript:void(0);"
								class="network-download" data-type="png"> 이미지 파일 (PNG) </a> <a
								href="javascript:void(0);" class="network-download"
								data-type="jpg"> 이미지 파일 (JPG) </a>
						</div>
	
					</div>
					<!-- 다운로드드롭다운 -->
					
	
					<!-- // 201203 수정 : 확대축소 -->
					<!-- 현재 탭 aria-live="polite" 표시 -->
					<div class="relDgrTab-cont active" aria-live="polite">
						<div id="network-chart-container" style="width: inherit; height: inherit;"></div>
					</div>
				</div>
				<!-- 키워드 관계도 분석 END -->
				</div>`;
	let $parentBodyInner = $(e).closest('.chat-1as');
	$($parentBodyInner).append(content);
	chartColorMap = {
		"PERSON": $('.rel-control-info .item01.active').css("background-color"),
		"LOCATION": $('.rel-control-info .item02.active').css("background-color"),
		"ORGNIZATION": $('.rel-control-info .item03.active').css("background-color"),
		"KEYWORD": $('.rel-control-info .item04.active').css("background-color"),
		"NEWS": "#337ab7",
		"COMPANY": "#1565C0",
		"PRODUCT": "#D9534F"
	};
	var relChartWidth = $(e.target).closest('.keyword_line').width() - 30;
	var relChartHeight = 800;
	if ($('.chat_contents').width() < 1350) {
		relChartHeight = $('.chat_contents').width() - 40;
	}

	var relChart = new NetChart({
		advanced: {
			useAnimationFrame: false
		},
		container: document.getElementById(`network-chart-container`),
		area: {
			width: relChartWidth,
			height: relChartHeight
			//height: 776
		},
		interaction: {
			zooming: {
				wheel: false
			},
			selection: {
				linksSelectable: false,
				tolerance: 5
			}
		},
		layout: {
			nodeSpacing: 5,
		},
		navigation: {
			initialNodes: ["ROOT"]
		},
		toolbar: {
			enabled: false
		},
		auras: {
			overlap: true
		},
		style: {
			scaleObjectsWithZoom: false, // Node 배치(position) 설정
			nodeLabel: {
				padding: 4,
				borderRadius: 4,
				textStyle: { font: "14px Noto Sans KR", fillColor: "black" },
				backgroundStyle: { fillColor: "rgba(255, 255, 255, 0)" },
				scaleWithZoom: false,
				scaleWithSize: false
			},
			nodeAutoScaling: "logaritmic",
			nodeRadiusExtent: [10, 30],
			nodeLabelScaleBase: 10,
			node: {
				fillColor: "#fff"
			}, nodeLocked: {
				anchorMode: 2 // Fixed = 2, Floating = 0, Scene = 1,
			}, link: {
				fillColor: "#ddd"
			}, nodeStyleFunction: function(node) {
				// node.data.weight = parseInt(Math.log10(node.data.weight * 10) * 4);
				// node.radius += node.data.weight;
				node.label = node.data.label_ne || node.data.title || "";

				node.radius = node.data.node_size * 3 + 5;

				if (node.data.category == "ROOT") { // TODO: BIGKinds의 고유 색상 활용 필요함
					node.label = "검색어";
					node.fillColor = "#0D3860";
				} else if (node.data.category == "PERSON") {
					node.fillColor = chartColorMap["PERSON"];
				} else if (node.data.category == "LOCATION") {
					node.fillColor = chartColorMap["LOCATION"];
				} else if (node.data.category == "ORGNIZATION") {
					node.fillColor = chartColorMap["ORGNIZATION"];
				} else if (node.data.category == "KEYWORD") {
					node.fillColor = chartColorMap["KEYWORD"];
				} else if (node.data.category == "NEWS") {
					node.fillColor = chartColorMap["NEWS"];
				} else if (node.data.category == "COMPANY") {
					node.fillColor = chartColorMap["COMPANY"];
				} else if (node.data.category == "PRODUCT") {
					node.fillColor = chartColorMap["PRODUCT"];
				} else {
					node.fillColor = "#aaa";
				}

				if (node.hovered) {
					for (var i = 0; i < node.links.length; i++) {
						node.links[i].shadowColor = node.fillColor;
						node.links[i].fillColor = node.fillColor;
					}
				}
			}, linkStyleFunction: function(link) {
				if (link.hovered) {
					link.shadowColor = "#ddd";
					link.fillColor = "#ddd";
				}
				if (link.data.weight !== undefined) {
					link.radius = link.data.weight * 0.637;
				}
			}
		}
	});

	// 오늘 날짜
	var today = new Date();

	// 3개월 이전 날짜 계산
	var threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(today.getMonth() - 3);

	// 결과 출력 (예시)

	let startDate = formatDate(today);
	let endDate = formatDate(threeMonthsAgo);
	self.analysisRelationships = new AnalysisRelationships(relChart, keyword, endDate, startDate);
	let offset = $(document).find('.DVSL-interaction').offset(); //선택한 태그의 위치를 반환                //animate()메서드를 이용해서 선택한 태그의 스크롤 위치를 지정해서 0.4초 동안 부드럽게 해당 위치로 이동함 	        $('html').animate({scrollTop : offset.top}, 400);
	$('.scroll-area').stop().animate({ scrollTop: ($('.scroll-area').scrollTop() + offset.top) }, 500);
}


// 날짜를 원하는 형식으로 포맷하는 함수
function formatDate(date) {
	var year = date.getFullYear();
	var month = (date.getMonth() + 1).toString().padStart(2, '0');
	var day = date.getDate().toString().padStart(2, '0');
	return year + '-' + month + '-' + day;
}


/*
		  출처 스와이퍼 영역
   */
/*
function referrenceGetSwiper(tebOnId) {
	let swiperOuterLength = $(`#${tebOnId} .kw-conbox`).length + 1;
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.kw-conbox'); // 모든 '.kw-conbox' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.answer_cont' 요소 선택

	if (referencesArray.length > 0) {
		let liStr = "";
		let publishedAtObject;

		// 년, 월, 일 추출
		let year;
		let month;
		let day;

		// 년월일 형식으로 조합
		let formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
		let refNum = 0;
		for (let reference of referencesArray) {
			publishedAtObject = new Date(reference.attributes.published_at);
			year = publishedAtObject.getFullYear();
			day = publishedAtObject.getDate();
			month = publishedAtObject.getMonth() + 1; // 월은 0부터 시작하므로 1을 더함
			formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
			liStr += `<li class="swiper-slide">
	                <a href='javascript:referrencePop("${reference.attributes.news_id}")'>
	                    <div class="tit_line">
	                        <span class="tit">${reference.attributes.provider}</span>
	                        <span class="${referencesChkArray.indexOf(refNum) === -1 ? 'ref' : 'num'}">
							    ${referencesChkArray.indexOf(refNum) === -1 ? '연관' : refNum + 1}
							</span>
	                    </div>
	                    <div>${formattedDate}</div>
	                    <p class="cont">
	                        ${reference.attributes.title}
	                    </p>
	                </a>
	            </li>`;
			refNum++;
		}

		// 맨 마지막 '.body_inner'에만 콘텐츠 추가
		$(lastBodyInnerCont).append(`
	            <div class="origin_wrap">
	                <p class="origin_counter">출처<span class="bold">${referencesArray.length}</span>건</p>
	            </div>
	            <div class="kw-conbox kw-conbox-${swiperOuterLength}">
	                <div class="swiper originSwiper_${swiperOuterLength}">
	                    <ul class="origin_list_wrap swiper-wrapper">
	                        ${liStr}
	                    </ul>
	                </div>
	                <div class="swiper-button-next box-sw-btn box-sw-next"></div>
	                <div class="swiper-button-prev box-sw-btn box-sw-prev"></div>
	            </div>
	        `);

		// 스와이프 함수 호출
		createOrUpdateSwiper(tebOnId, swiperOuterLength);
	}
}*/

function fn_vote(type, msgId) {

	Swal.fire(
		{
			title: "피드백 의견 반영하시겠습니까?",
			text: "",
			icon: 'question',
			showCancelButton: true, // cancel버튼 보이기. 기본은 원래 없음
			confirmButtonColor: '#3085d6', // confrim 버튼 색깔 지정
			cancelButtonColor: '#d33', // cancel 버튼 색깔 지정
			confirmButtonText: '네', // confirm 버튼 텍스트 지정
			cancelButtonText: '아니오', // cancel 버튼 텍스트 지정                
			reverseButtons: false, // 버튼 순서 거꾸로
		}).then((result) => {
			//만약 Promise 리턴을 받으면,
			if (result.isConfirmed) {

				let data = {
					"msgId": msgId,
					"type": type
				};
				$.ajax({
					type: "POST",
					async: false,
					url: "/bigkindsAi/vote.do",
					contentType: "application/json",
					data: JSON.stringify(data),
					//       dataType : "json"
					beforeSend : function(request) {
						request.setRequestHeader('ajax', 'true');
					},
					success: function(result) {
						Swal.fire(
							'소중한 의견 감사합니다.',
							'',
							'success'
						)
					},
					error: function(request, status, error) {
					}
				})
			}
		})
}
//잔여 토큰 불러오기
function fn_limitChk() {
	let data = {
	};
	$.ajax({
		type: "POST",
		async: false,
		url: "/bigkindsAi/tokenLimitChk.do",
		contentType: "application/json",
		data: JSON.stringify(data),
		//       dataType : "json"
		beforeSend : function(request) {
			request.setRequestHeader('ajax', 'true');
		},
		success: function(result) {
			if (result.useYn == 'Y') {
				$('.rest_que').show();
				$('#limitCnt').text(result.availableCnt);
			} else {
				$('.rest_que').hide();
			}
		},
		error: function(request, status, error) {
		}
	})
}

//잔여 토큰 불러오기
function fn_userMemaulChk() {
	if(menualCk == '0'){
		let data = {
		};
		$.ajax({
			type: "POST",
			async: false,
			url: "/bigkindsAi/insertUserMenualPop.do",
			contentType: "application/json",
			data: JSON.stringify(data),
			//       dataType : "json"
			beforeSend : function(request) {
				request.setRequestHeader('ajax', 'true');
			},
			success: function(result) {},
			error: function(request, status, error) {
			}
		})
	}
}

// 오류 문구 출력
function returnError(){
	let tebOnId = $('.rclt-item.on').data('data');
	appendMessage(tebOnId, '\r\n' + '<div class="error_box">에러가 발생했습니다. 문제가 지속되면 고객센터에 문의하십시오.</div>');
	let answerArea = document.querySelector("[id='" + tebOnId + "']");
	let answerContElements = answerArea.querySelectorAll('.chat-1as');
	let lastAnswerCont = answerContElements[answerContElements.length - 1];
	let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
	if (answerIcon) {
		fnLoadingIntervalStop();
		answerIcon.nextElementSibling.textContent = "답변";
		answerIcon.classList.remove('ai-as-loading');
		$('span.blink-ef').removeClass('blink-ef');
		setSendBlock('N');	// 채팅 입력창 활성화
	}

	$('#chatStopBtn').hide();
	$('#chatRechatBtn').show();
	//토큰 횟수 체큰
	// 임시 주석
	// fn_limitChk();
}

/** 파일 업로드 **/
function fnFileUpload(){
	var formData = new FormData();
	var files = document.querySelector('input[type="file"]').files;

	let fileNameHtml = "";
	for (var i = 0; i < files.length; i++) {
		formData.append('files', files[i]); // 'files'는 서버에서 받을 파라미터명
		fileNameHtml += `<div class="add-filename">`+ files[i].name +`</div>`;
	}
	formData.append('chatId', chatID);
	
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "/bigkindsAi/aiupload.do",
			data: formData,
			processData: false,
			contentType: false,
			success: function(result) {
				resolve(result);
				
				const ctAsWrap = document.querySelector('.ct-as-wrap');
				const newContent = `<div class="add-fn-con">`+fileNameHtml+`</div>`;
				ctAsWrap.querySelector('h1').insertAdjacentHTML('afterend', newContent);
				
				document.querySelector('.attach-file').remove();
			},
			error: function(request, status, error) {
			} 
		});
	});
}

/** 파일 키워드 가져오기 **/
function fnFileKeyword(){
	var formData = new FormData();
	formData.append('chatId', chatID);
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "/bigkindsAi/fileKeyword.do",
			data: formData,
			processData: false,
			contentType: false,
			success: function(result) {
				if(result.status != 'error'){
					if(isFileAI == "Y") {
						for(let data of result.data){
							// 키워드 영역, 관련 뉴스 보기 생성
							createFileKeyword(data);
							// 추천 질의 생성
							createFileRelatedQueries(data);
						}
					}
				}else{
					let tebOnId = $('.rclt-item.on').data('data');
					appendMessage(tebOnId, '\r\n' + '<div class="error_box">키워드 생성에 실패했습니다. 문제가 지속되면 고객센터에 문의하십시오.</div>');
				}
				
				let answerArea = document.querySelector("[id='" + chatID + "']");
				let answerContElements = answerArea.querySelectorAll('.chat-1as');
				let lastAnswerCont = answerContElements[answerContElements.length - 1];
				let answerIcon = lastAnswerCont.querySelector('.ai-as-ch');
			
				if (answerIcon) {
					fnLoadingIntervalStop();
					answerIcon.nextElementSibling.textContent = "답변";
					answerIcon.classList.remove('ai-as-loading');
					$('span.blink-ef').removeClass('blink-ef');
					setSendBlock('N');	// 채팅 입력창 활성화
				}
				$('#chatStopBtn').hide();
				$('#chatRechatBtn').show();
			},
			error: function(request, status, error) {
			} 
		});
	});
}

function createFileKeyword(data) {
	let answerArea = document.querySelector("[id='" + chatID + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.kw-foot2'); // 모든 '.kw-foot' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.kw-foot' 요소 선택
	let liStr = "";
	
	for(let keyword of data.keywords){
		liStr += `<button type="button" class="pg-btn ai-cre-btn" data-keyword='${keyword}'>${keyword}</button>`;	
	}
	
	$(lastBodyInnerCont).append(`
		<div class="kh-tit">`+data.file_name+`</div>
		<div class="kh-item1">
			<div class="f-center keyword_line" style="gap: 4px;">
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
					<button type="button" class="speech-btn" data-tooltip="만족해요" onclick="fn_vote('up','`+chatID+`')">
						<img src="../kindsAiAssets_2024/images/icon/good.svg" alt="">
					</button>
					<button type="button" class="speech-btn" data-tooltip="아쉬워요" onclick="fn_vote('down','`+chatID+`')">
						<img src="../kindsAiAssets_2024/images/icon/bad.svg" alt="">
					</button>
					<button type="button" class="speech-btn copy-btn btn_copy" data-tooltip="복사하기">
						<img src="../kindsAiAssets_2024/images/icon/copy.svg" alt="">
						<img src="../kindsAiAssets_2024/images/icon/ck.svg" alt="">
					</button>
				</div>
			</div>
			<div class="kw-btn-wrap2"></div>
		</div>
	`);
}

/*
	   키워드 추천 질문 영역
*/
function createFileRelatedQueries(data) {
	let answerArea = document.querySelector("[id='" + chatID + "']");
	let bodyInnerContElements = answerArea.querySelectorAll('.kw-btn-wrap2'); // 모든 '.order-ch-rc' 요소를 선택
	let lastBodyInnerCont = bodyInnerContElements[bodyInnerContElements.length - 1]; // 마지막 '.order-ch-rc' 요소 선택
	let liStr = "";
	
	for(let q of data.related_queries){
		liStr += `<button type="button" onclick ="clickQuestion('${q}')" class="od-ch-btn">${q}</button>`;
	}
	
	$(lastBodyInnerCont).append(`
		${liStr}
	`);
}


$(document).on('click', '.relateNews', async function() {
	let selectedElement = $(this).parent().parent().prev();
	let type = $('#thisChatType').val();
	let q = "";
	selectedElement[0].querySelectorAll('.kw-btn-wrap2 .pg-btn').forEach(function(el) {
		q = q + "," + el.textContent;
	});
	q = q + " 관련 기사 찾아줘";
	
	isFileAI = "N";
	isFileFlag = true;
	await answer_append(q, type);
	isFileAI = "Y";
	isFileFlag = false;
});