$(document).ready(function() {
    const rcExpentButton = document.querySelector('.rc-expent');
    rcExpentButton.addEventListener('click', function() {
        const recentList = document.querySelector('.recent-list');
        const mainCon = document.querySelector('.main-con');
        recentList.classList.toggle('open');
        mainCon.classList.toggle('open');

        rcExpentButton.classList.toggle('on');
    });

    const reExpentButtons = document.querySelectorAll('.re-expent');
    reExpentButtons.forEach(button => {
        button.addEventListener('click', function() {

            reExpentButtons.forEach(btn => btn.classList.remove('on'));

            this.classList.add('on');
        });
    });
});