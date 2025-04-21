$(document).ready(function () {
  // $("#leftMenu").load("leftmenu.html");

  $('label').attr('tabindex', '0');

// 스크롤 이벤트
$('.scroll-area').on('scroll', function() {
  var scrollHeight = $(this)[0].scrollHeight; 
  var clientHeight = $(this)[0].clientHeight; 
  var scrollTop = $(this)[0].scrollTop;

  // 콘텐츠 높이가 보이는 영역의 높이를 초과할 때
  if (scrollHeight > clientHeight) {
      $('.sc-dw').addClass('on');
  } else {
      $('.sc-dw').removeClass('on');
  }

  // 스크롤이 맨 위로 올라가면 'on' 클래스를 추가
  if (scrollTop === 0) {
      $('.sc-dw').addClass('on');
  }

  // 스크롤이 맨 아래로 내려가면 'on' 클래스를 제거
  if (scrollTop + clientHeight === scrollHeight) {
      $('.sc-dw').removeClass('on');
  }
});

/** 채팅 화면 스크롤 다운 **/
function chatScrollDown(){
	$('.sc-dw').removeClass('on');
	var aniSpeed = $(window).width() <= 768 ? 0 : 500;

	$('.scroll-area').animate({
		scrollTop: $('.scroll-area')[0].scrollHeight 
	}, aniSpeed);
}

$('.sc-dw-btn').click(function(event) {
	event.preventDefault();
	chatScrollDown();
});

$('.rc-fold-btn').on('click', function(){
	$('.recent-list').removeClass('open');
	$('.main-con').removeClass('open');
	$('.menu-wrap .rc-expent').removeClass('on');
});


 // 말풍선 이벤트
 $('.speech-btn').on('mouseenter focus', function () {
  var tooltipText = $(this).data('tooltip'); 
  var $tooltip = $('<div class="icon-name br-min">' + tooltipText + '</div>');
  $('body').append($tooltip);

  var offset = $(this).offset();
  var tooltipHeight = $tooltip.outerHeight();
  var elementHeight = $(this).outerHeight();

  // 기본 상단 위치
  var top = offset.top - tooltipHeight - 4; // 상단으로 배치
  var left = offset.left 

  // 화면 경계 체크
  if (top < 0) { // 화면 상단을 벗어날 경우
      top = offset.top + elementHeight + 4; // 하단으로 배치
  }

  // 툴팁 위치 적용
  $tooltip.css({
      position: 'absolute',
      top: top,
      left: left,
      opacity: 1
  }).addClass('on');

  // 마우스 벗어나면 제거
  // $(this).on('mouseleave blur', function () {
  //     $tooltip.remove();
  // });
  var removeTooltip = function(){$tooltip.remove();};

  $(this).on('mouseleave blur', removeTooltip);
  $('.scroll-area').on('scroll',removeTooltip);

  $tooltip.on('remove',function(){
    $(window).off('scroll',removeTooltip);
  });
});

});

// 검색영역 이벤트발생
document.addEventListener('DOMContentLoaded', () => {
  const edTextarea = document.querySelector('.editable');
  const chatSearch = document.querySelector('#chat-search');
  const sendSvg = document.querySelector('.send-btn svg path');

  edTextarea.addEventListener('focus', () => {
    // 포커스가 되었을 때
    chatSearch.classList.add('on');
  });

  edTextarea.addEventListener('blur', () => {
    // 포커스가 해제되었을 때
    if (edTextarea.textContent.trim() === '') {
      chatSearch.classList.remove('on');
    }
  });

  edTextarea.addEventListener('input', () => {
    // 텍스트 입력 시
    if (edTextarea.textContent.trim() !== '') {
      chatSearch.classList.add('on');
      sendSvg.style.fill = 'var(--primary)';

    } else {
      chatSearch.classList.remove('on');
      sendSvg.style.fill = ''; // 텍스트가 없으면 기본 색상으로 되돌리기
    }
});


// 지역일간지 언론사 구분 내 더보기('+') 팝업창 이벤트
$(document).on('click', '.add-depth-day, .add-depth-week', function(e) {
	e.preventDefault();

	var $pop = "";

	if ($(this).hasClass('add-depth-day')) $pop = $(this).closest('.modal-bg').find('.province-pop-day');
	else if ($(this).hasClass('add-depth-week')) $pop = $(this).closest('.modal-bg').find('.province-pop-week');
	
	var buttonOffset = $(this).offset(); 
	var buttonHeight = $(this).outerHeight();

	if ($(this).hasClass('add-depth-day')){
		$('.add-depth-day').not(this).removeClass('on');
		$('.province-pop-day').not($pop).hide();
	}else if ($(this).hasClass('add-depth-week')){
		$('.add-depth-week').not(this).removeClass('on');
		$('.province-pop-week').not($pop).hide();
	}
	
	var gubunCode = this.dataset.gubuncode;
	modalGubunCode = gubunCode;
		
	if ($pop.is(':visible')) {
		$pop.hide();
	} else {
		$pop.show();
		var popWidth = $pop.outerWidth(); 
		var leftPosition = buttonOffset.left + 4;

		// 팝업이 화면 오른쪽을 벗어나는 경우 오른쪽으로 위치 조정
		if (leftPosition + popWidth > $(window).width()) {
			leftPosition = buttonOffset.left - popWidth + 8;
		}

		$pop.css({
			display: 'grid',
			position: 'absolute',
			top: buttonOffset.top + buttonHeight + 4,
			left: leftPosition
		}).show();

		$(this).addClass('on');
	}
});

// 화면 외부 클릭 시 팝업 숨김 처리
$(document).on('click', function (e) {
	/*
	if (!$(e.target).closest('.province-pop-day, .add-depth-day').length) {
		$('.province-pop-day').hide();
		$('.add-depth-day').removeClass('on');
	}
	if (!$(e.target).closest('.province-pop-week, .add-depth-week').length) {
		$('.province-pop-week').hide();
		$('.add-depth-week').removeClass('on');
	}*/
	if (!$(e.target).closest('.province-pop, .add-depth').length) {
		$('.province-pop').hide();
		$('.add-depth').removeClass('on');
	}
});

// .file-add 클릭 시 input[type="file"] 요소 클릭
document.querySelector('.file-add').addEventListener('click', function() {
	
	if(isLogin == 'false'){
		Swal.fire(
			'로그인 후 이용 가능합니다.',
			'',
			'info'
		)
		return;
	}
	
	if($('#thisChatType').val() != 'main'){
		Swal.fire(
			{
				title: "파일 첨부는 새 대화에서 가능합니다.<br>새 대화에서 진행하시겠습니까?",
				text: "",
				icon: 'warning',
				showCancelButton: true, // cancel버튼 보이기. 기본은 원래 없음
				confirmButtonColor: '#3085d6', // confrim 버튼 색깔 지정
				cancelButtonColor: '#d33', // cancel 버튼 색깔 지정
				confirmButtonText: '네', // confirm 버튼 텍스트 지정
				cancelButtonText: '아니오', // cancel 버튼 텍스트 지정
				reverseButtons: false, // 버튼 순서 거꾸로
			}).then((result) => {
				if (result.isConfirmed) {
					$(".new-chat-btn").click();
					return;
				}else{
					return;
				}
			});
	}else document.getElementById('file-input').click(); // 파일 선택 창 열기
});

// 파일 선택 후 처리
document.getElementById('file-input').addEventListener('change', function (event) {
	const files = event.target.files; // 선택된 파일들
	const container = document.querySelector('.attach-file'); // .sh-wrap 요소를 부모 컨테이너로 설정
	const addButton = document.querySelector('.file-add');

	if(files.length > 2){
		Swal.fire(
			'파일은 2개 이상 적용할 수 없습니다.',
			'',
			'warning'
		)
		return;
	}

	// 파일들 처리
	Array.from(files).forEach(async file => {
		
		let fileSize = (file.size / (1024 * 1024)).toFixed(2);
		if(fileSize > 2){
			Swal.fire(
				'2MB 이상 파일은 사용할 수 없습니다.',
				'',
				'warning'
			)
			return;
		}
		
		const reader = new FileReader();
		const fileDiv = document.createElement('div'); // 각 파일용 <div> 생성
		const fileWrap = document.createElement('div')
		const fileName = document.createElement('div');
		const fileIcon = document.createElement('div');
		const fileSvg = document.createElement('img');
		const delBtn = document.createElement('button');
		const delSvg = document.createElement('img');
		fileSvg.src = '../kindsAiAssets_2024/images/icon/document.svg';
		delSvg.src = '../kindsAiAssets_2024/images/icon/close-white.svg'
		
		fileName.textContent = file.name; // 파일 이름 추가
		delBtn.classList.add('file-del-btn');
		
		// 이미지 파일인지 확인
		if (file.type.startsWith('image')) {
			fileDiv.classList.add('image-file','at-filebox'); // 이미지 파일에 클래스 추가
		} else {
			fileDiv.classList.add('other-file','at-filebox'); // 이미지 외 파일에 클래스 추가
			fileIcon.classList.add('ot-file-icon');
			fileWrap.classList.add('ot-file-inner');
		}

		reader.onload = async function (e) {
			const tag = document.createElement('p');
			
			if (file.type.startsWith('image')) {
				// 이미지 파일일 경우
				const img = document.createElement('img');
				img.src = e.target.result; // 이미지 파일의 URL
				img.style.width = '100%';
				img.style.height = '100%';
				fileDiv.appendChild(delBtn);
				fileDiv.appendChild(delBtn).appendChild(delSvg);
				fileDiv.appendChild(img); // 이미지 추가
			} else if (file.type === 'application/pdf') {
				// PDF 파일일 경우
				tag.textContent = 'PDF';
				
				const pdfData = new Uint8Array(reader.result);
				try {
					const pdf = await pdfjsLib.getDocument(pdfData).promise;
					if(pdf.numPages > 30) {
						Swal.fire(
							'30page 이상의 PDF파일은 사용할 수 없습니다.',
							'',
							'warning'
						)
						return;
					}
				} catch (error) {
					console.error('PDF 읽기 오류:', error);
				}
			} else if (file.type === 'text/plain') {
				// TXT 파일일 경우
				tag.textContent = 'txt';
			} else if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
				// PPT 파일일 경우
				tag.textContent = 'PPT';
			} else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
				// DOCX 파일일 경우
				tag.textContent = 'DOCX';
			} else if (file.name.endsWith('.hwp') || file.name.endsWith('.hwpx')) {
				// hwp 파일일 경우
				tag.textContent = 'HWP';
			} else if (file.name.endsWith('.xlsx')) {
				// xlsx 파일일 경우
				tag.textContent = 'xlsx';
			} else {
				// 기타 파일 처리
				// alert(`Unsupported file type: ${file.name} 추가할 수 없는 파일입니다.`);
				Swal.fire(
					'추가할 수 없는 파일이 있습니다.',
					file.name,
					'warning'
				)
				return; // 파일 추가 중단
			}
			
			if(files.length > 0) $('#thisChatType').val('fileAI');
			
			fileDiv.appendChild(fileIcon); // 파일 아이콘 div 추가
			fileDiv.appendChild(delBtn); // 파일 삭제 버튼 추가
			fileDiv.appendChild(delBtn).appendChild(delSvg); // 파일 삭제 버튼 아이콘 추가
			fileDiv.appendChild(fileIcon).appendChild(fileSvg); // 파일 아이콘 추가
			fileDiv.appendChild(fileWrap).appendChild(fileName); // 파일 이름 추가
			fileDiv.appendChild(fileWrap).appendChild(tag); // 파일 종류 텍스트 추가
			
			// 파일을 .sh-wrap의 첫 번째 자식으로 추가 (항상 위에서부터 쌓임)
			container.insertBefore(fileDiv, container.firstChild);
	
			delBtn.addEventListener('click',function(){
				fileDiv.remove();
				checkFileCount();
			});
			checkFileCount();
		};

		// 파일 읽기 시작 (이미지와 텍스트 파일은 미리보기 가능)
		if (file.type.startsWith('image') || file.type === 'text/plain') {
			reader.readAsDataURL(file); // 이미지 URL 또는 텍스트 데이터 URL 생성
		} else {
			reader.readAsArrayBuffer(file); // PDF, PPT 등은 데이터를 ArrayBuffer로 읽음
		}
	});

	// 파일 수 확인 함수
	function checkFileCount() {
		const fileCount = container.querySelectorAll('.at-filebox').length; // 현재 파일 요소 수
		addButton.disabled = fileCount >= 2; // 파일 수가 3개를 초과하면 버튼 비활성화

		// .at-filebox가 없을 경우 margin 초기화
		if (fileCount === 0) {
			container.style.margin = '0 0 0 0';
		} else {
			container.style.margin = '0 0 20px 0';
		}
	}
});




$('.media-sl-btn').on('click',function(){
	$('#mediaSl').addClass('open');
});

$('.close-btn').on('click',function(){
  $(this).closest('.modal-bg').removeClass('open');
});



// 언론사 저장 모달 활성화
$('.media-save-btn').on('click',function(){
	if(isLogin == 'false'){
		Swal.fire(
			'로그인 후 이용 가능합니다.',
			'',
			'info'
		)
		return;
	}
	selectProvider = "";
	selectCode = "";
	$('#set_favorite_list').empty();
	const elements = document.querySelectorAll('.sl-value');
	
	elements.forEach(element => {
		selectProvider += element.textContent+",";
		selectCode += element.dataset.code+",";
	});
	
	if(selectProvider == ''){
		Swal.fire(
			'언론사를 선택해 주세요.',
			'',
			'warning'
		)
		return;
	}
	setMyProviderModal(selectProvider, selectCode);
});

$('.cancel-btn').on('click',function(){
  $(this).closest('.modal-bg').removeClass('open');
});

// 나의 언론사 모달 활성화
$('.mymd-btn').on('click',function(){
	if(isLogin == 'false'){
		Swal.fire(
			'로그인 후 이용 가능합니다.',
			'',
			'info'
		)
		return;
	}
	setMyProviderListModal();
	$('#mediaList').addClass('open');
});



/*한줄팁 슬라이드 추가 20231218*/
var tipSwiper = new Swiper(".tipSwiper", {
  direction: "vertical",
  autoplay: true,
  loop:true,
  navigation: {
      nextEl: ".tipSwiper_outer .swiper-button-next",
      prevEl: ".tipSwiper_outer .swiper-button-prev",
  },
});
/*한줄팁 슬라이드 재상 멈춤 제어*/
var playStop = document.querySelector('.control_wrap .playStop');
playStop.addEventListener('click', function (e) {
  $this = e.currentTarget;		
  if (!$this.classList.contains('on')) {
      tipSwiper.autoplay.stop();
      tipSwiper.autoplay.stop();
      $this.classList.add('on');
      $(this).find('span.hidden_playStop').text('배너이동 재생');
  } else {
      tipSwiper.autoplay.start();
      tipSwiper.autoplay.start();
      $this.classList.remove('on');
      $(this).find('span.hidden_playStop').text('배너이동 멈춤');
  }
});



$('.mob-btn').on('click',function(){
  $(this).toggleClass('on');
  $('.mob-bg').toggleClass('open');
});


// alert 이벤트
/*
document.querySelector('.copy-btn').addEventListener('click', function () {
  this.classList.add('on');
  
  const alertPosition = document.querySelector('.copy-alt');
  alertPosition.classList.add('on');

  setTimeout(() => {
      this.classList.remove('on');
      alertPosition.classList.remove('on');
  }, 3000);
});
*/

document.querySelector('.mob-bkgd').addEventListener('click', function () {
  this.classList.add('on');
  
  const alertPosition = document.querySelector('.bkgd-alt');
  alertPosition.classList.add('on');

  setTimeout(() => {
      this.classList.remove('on');
      alertPosition.classList.remove('on');
  }, 3000);
});


	// 개별 언론사 선택 모달 open
	$(document).on('click','.eh-md-btn',function(event){
		let providerHtml = "";
		let cnt=1;
		const el = event.target.parentElement.parentElement.parentElement;
		const elements = el.querySelectorAll('.box-head');
		
		// 중복 제거
		let providers = new Set();		
		elements.forEach((element) => {
			let provider = element.dataset.provider;
			providers.add(provider);
		});
		// 중복 제거 후 다시 돌리기
		elements.forEach((element) => {
			let provider = element.dataset.provider;
			let ref = element.dataset.ref;
			
			if (providers.has(provider)) {
				providerHtml += `			<div class="eh-item">
													<input type="checkbox" id="ehMd`+cnt+`" name="each">
													<label for="ehMd`+cnt+`" class="eh-ck-btn">
														<img src="../kindsAiAssets_2024/images/news-symbol1.svg" alt="">
														<strong>`+provider+`</strong>`;
				if(ref == 'ref')providerHtml += `<span>연관</span>`;
				providerHtml += 				`</label>
												</div>
											`;
				cnt = cnt + 1;
				providers.delete(provider);
			}
		});
		providerHtml += `<p>ⓘ 원하시는 언론사를 선택하시고 확인을 누르시면 개별 답변을 받아보실 수 있습니다. </p>`;
		
		$('.providerEachView').empty();
		$('.providerEachView').append(providerHtml);
		$('.modal-btn-wrap .emck-btn').prop('disabled', true);
		$('#eachMedia').addClass('open');
		
		const tempE = $(event.target).closest('.chat-1as');
		tempQuestion = tempE.find('h1').text()
	});
	
	// 개별 언론사 모달 선택 변경 이벤트
	$(document).on('change','input[type="checkbox"][name="each"]',function(){
		if ($('input[type="checkbox"][name="each"]:checked').length > 0) {
			$('.modal-btn-wrap .emck-btn').prop('disabled', false);
		}
	});

	// 개별 언론사 적용
	$(document).on('click','.emck-btn',function(){
		/* 2024 임시 주석
		$(this).addClass('on');
	
		const $target = $('body').find('.each-md-as');
		$target.css('display', 'block'); // 표시 후
	
		setTimeout(() => {
			const offsetTop = $target.offset().top;
			$('.scroll-area').stop(true).animate({ scrollTop: offsetTop }, 400);
		}, 10);
		*/
		
		var selectedCheckbox = $('input[type="checkbox"][name="each"]:checked');
		var provider = selectedCheckbox.map(function() {
			return $(this).closest('.eh-item').find('strong').text();
		}).get().join(',');
		eachProviderSendMessage(provider);
		$('#eachMedia').removeClass('open');
		provider = "";
	});
});

// input[type="checkbox"] 클릭 이벤트
$('input[type="checkbox"][name="each"]').on('change', function () {
	if ($('input[type="checkbox"][name="each"]:checked').length > 0) {
		$('.modal-btn-wrap button').prop('disabled', false);
	}else {
		$('.modal-btn-wrap button').prop('disabled', true);
	}
});

// 채팅 5번 초과됬을때 disabled 처리
/*
document.addEventListener('DOMContentLoaded', function () {
	const camTextarea = document.getElementById('conversation-input');
	const chatSearch = document.getElementById('chat-search');
	const Switch = document.getElementById('switch');
	const Button = document.querySelector('.media-sl-btn');
	const fileBtn = document.querySelector('.file-add');
	let enterCount = 0;

	camTextarea.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			enterCount++;
		}

		// Enter 키가 5회를 초과하면 클래스 추가
		if (enterCount > 5) {
			camTextarea.disabled = true;
			camTextarea.placeholder = '로그인을 하시면 계속 질문하실 수 있습니다.';
			chatSearch.classList.add('disabled');
			Switch.checked = false;
			Button.disabled = true;
			fileBtn.disabled = true;
		}
	});

	// 선택적으로 Enter 횟수 초기화 기능
	camTextarea.addEventListener('input', function () {
	});
});
*/


