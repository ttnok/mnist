"use strict";

const $ = selector => {
    return document.querySelector(selector);
};
const $$ = selector => {
    return document.querySelectorAll(selector);
};

const canvas = $('canvas');
const context = canvas.getContext('2d', {alpha: false});

let dataset = {
    required: {
        label: "train-labels-idx1-ubyte",
        image: "train-images-idx3-ubyte"
    },
    loaded: {
        label: false,
        image: false
    }
};

const imageData = context.createImageData(canvas.width, canvas.height);
let data = imageData.data;  // : Uint8ClampedArray

let data_view = {  // would be an instance of DataView
    label: null,
    image: null
};

let label = [];       // labels (1-based)

const load_labels = () => {  // load ALL labels
    const offset = 8;
    const data_size = data_view.label.getUint32(4);
    console.log(data_size);
    for (let i = 0; i < data_size; i++) {
        label[i + 1] = data_view.label.getUint8(offset + i);
        // 1-based
    }
};

const load_nth_image = n => {  // 1-based
    const offset = 16 + 28 * 28 * (n - 1);

    for (let i = 0; i < 28 * 28; i++) {
        let d = data_view.image.getUint8(offset + i);
        data[4 * i] = data[4 * i + 1] = data[4 * i + 2] = d;
    }

    context.putImageData(imageData, 0, 0);
};

const n_images_in_each_page = 500;

const build_pages = (n_start = 1, n_end = 10) => {
    // create array of arrays from [n_start, ... , n_end]
    // splitted for each page
    const pages = [...Array(n_end - n_start + 1).keys()].map(p => p + n_start);
    const splitted = pages.reduce((splitted, n) => {
        if (n % n_images_in_each_page === 1) {
            splitted.push([n]);
        } else {
            splitted.slice(-1)[0].push(n);
        }
        return splitted;
    }, []);

    // for each page
    splitted.forEach(image_nums => {
        // <section>
        const section = document.createElement('section');
        section.classList.add('page');
        
        // <h1>
        const h1 = document.createElement('h1');
        const n_start = image_nums[0];
        const n_end = image_nums.slice(-1)[0];
        h1.textContent = `${n_start} - ${n_end}`;
        // <div>
        const div = document.createElement('div');

        // <section>
        //   <h1>
        //   <div>
        section.appendChild(h1);
        section.appendChild(div);
        document.body.appendChild(section);

        // add <img>s as childnodes of the last <div>
        const images_elm = Array.from($$('.page > div')).slice(-1)[0];
        image_nums.forEach(n => {
            // <figure>
            let figure = document.createElement('figure');
            figure.classList.add('figure');
            figure.id = `fig-${n}`;

            // <img>
            let img = document.createElement('img');
            // img.classList.add('figure');
            // img.id = `fig-${n}`;

            // <figcaption>
            let figcaption = document.createElement('figcaption');

            // <div>
            //   <figure>
            //     <img>
            //     <figcaption>
            images_elm.appendChild(figure);
            figure.appendChild(img);
            figure.appendChild(figcaption);
        })
    })
};

const render = async (n_start = 1, n_end = 10) => {
    for (let n = n_start; n <= n_end; n++) {
        load_nth_image(n);
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        let url = URL.createObjectURL(blob);

        $(`#fig-${n} > img`).src = url;
        // $(`#fig-${n} > figcaption`).textContent = `${(''+n).padStart(5, '0')} - ${label[n]}`;
        $(`#fig-${n} > figcaption`).textContent = `${label[n]}`;
    }
};

const clear_outputs = () => {    
    $$('.page').forEach(page => page.remove());
};

const main = () => {
    build_pages(1, +$('#inputnumber > input').value);
    render(1, +$('#inputnumber > input').value);
};

/**
 * Event Listners
 */
$('body').addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
    $('body').classList.add('ondragging');
});

$('body').addEventListener('drop', e => {
    e.stopPropagation();
    e.preventDefault();

    $('body').classList.remove('ondragging');

    const load_handler = reader => (() => {
        let view = new DataView(reader.result);

        if (view.getUint32(0) === 2049) { // label
            data_view.label = view;
            $('#label_file').classList.add('loaded');
            load_labels();
        } else if (view.getUint32(0) === 2051) { // image
            data_view.image = view;
            $('#image_file').classList.add('loaded');
        } else {
            console.log('error: file collapsed.');
        }
    });

    let files = e.dataTransfer.files;
    let dropped_files = [...files];

    ['label', 'image']
        .filter(key => {
            return !dataset.loaded[key];
        })
        .forEach(key => {
            let required_filename = dataset.required[key];
            dropped_files.forEach(async f => {
                if (f.name === required_filename) {
                    const reader = new FileReader();
                    reader.addEventListener('load', load_handler(reader));
                    reader.readAsArrayBuffer(f);
                    dataset.loaded[key] = true;    
                }
            })
        });
});

$('#inputnumber > button').addEventListener('click', e => {
    const n_end = +$('#inputnumber > input').value;
    clear_outputs();
    build_pages(1, n_end);

    render(1, n_end);
});
