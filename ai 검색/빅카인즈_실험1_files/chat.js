$(document).ready(function(){
    var boxSwiper = new Swiper('.boxSwiper', {
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

// 빅카인즈 AI 가이드 모달
$('.guide-btn').on('click',function(){
    $('#aiGuide').addClass('open');
});

$('.all-close-btn').on('click',function(){
  $('.modal-bg').removeClass('open');
});

// 저장버튼 클릭시 이벤트 발생
const originalSvg = '<svg id="save" width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_17_1504)"><path d="M11.7 1.29088V13.2121L7.501 10.7143C7.1955 10.5336 6.851 10.4367 6.5 10.4367C6.149 10.4367 5.798 10.5336 5.499 10.7143L1.3 13.2121V1.29088H11.7ZM12.35 0H0.65C0.2925 0 0 0.290448 0 0.645439V14.3481C0 14.7225 0.312 14.9935 0.65 14.9935C0.7605 14.9935 0.8775 14.9613 0.9815 14.9032L6.162 11.818C6.266 11.7599 6.383 11.7276 6.4935 11.7276C6.604 11.7276 6.7275 11.7599 6.825 11.818L12.0055 14.9032C12.116 14.9677 12.2265 14.9935 12.337 14.9935C12.675 14.9935 12.987 14.7225 12.987 14.3481V0.645439C12.987 0.290448 12.6945 0 12.337 0H12.35Z" fill="#2A2A2A"/></g><defs><clipPath id="clip0_17_1504"><rect width="13" height="15" fill="white"/></clipPath></defs></svg>';
const newSvg = '<svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M0.650651 0H12.3493C12.7072 0 13 0.290573 13 0.645717V14.3543C13 14.7288 12.6877 15 12.3493 15C12.2387 15 12.1281 14.9742 12.0175 14.9096L6.83183 11.8231C6.73423 11.765 6.61061 11.7327 6.5 11.7327C6.38939 11.7327 6.27227 11.765 6.16817 11.8231L0.982482 14.9096C0.878378 14.9677 0.761261 15 0.650651 15C0.312312 15 0 14.7288 0 14.3543V0.645717C0 0.290573 0.292793 0 0.650651 0Z" fill="#2A2A2A"/></svg>';

let svgState = 'original';

$('.save_btn').on('click', function() {

    $('#alert_wrap').load('alertpop.html', function() {
        $('#alert_wrap').addClass('on');
        
        // SVG 상태에 따라 교체
        if (svgState === 'original') {
            // 새로운 SVG 코드로 변경
            $('.save_btn svg').replaceWith(newSvg);
            svgState = 'new'; 
        } else {
            // 원래 SVG 코드로 되돌리기
            $('.save_btn svg').replaceWith(originalSvg);
            svgState = 'original';
        }
        
        setTimeout(function() {
            $('#alert_wrap').empty().removeClass('on');
        }, 3000);
    });
});





	$('.ds-qbtn, .dh1-btn').on('click', function() {
		var $this = $(this); 
		var aw = $this.find('.aw');
		
		// 버튼에 따라 다르게 처리
		if ($this.hasClass('ds-qbtn')) {
			var qbox1depth = $this.closest('.ds-qbox').find('.qbox-1depth');
			
			// .dh1-list-box 초기화(닫기)
			$('.dh1-list-box').slideUp();
			
			aw.toggleClass('on');
			
			
			if (qbox1depth.is(':visible')) {
				qbox1depth.slideUp();
			} else {
				$('.qbox-1depth').slideUp();
				qbox1depth.slideDown();
			}
		} else if ($this.hasClass('dh1-btn')) {
			var dh1Listbox = $this.closest('.dh1-btn-wrap').siblings('.dh1-list-box');
			
			
			aw.toggleClass('on');
			
			if (dh1Listbox.is(':visible')) {
				dh1Listbox.slideUp();
			} else {
				dh1Listbox.slideDown();
			}
		}
	});
});