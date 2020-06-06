"use strict";

/**
 * global variables
 */

const $ = selector => {
    return document.querySelector(selector);
};
const $$ = selector => {
    return document.querySelectorAll(selector);
};

const canvas = $('canvas');
const context = canvas.getContext('2d', {alpha: false});

let dataset = {
    label: {
        filename: "train-labels-idx1-ubyte",
        loaded: false,
        dataview: null,
        data: []
    },
    image: {
        filename: "train-images-idx3-ubyte",
        loaded: false,
        dataview: null
    },
};

const n_images_in_each_page = 500;


/**
 * funcitons
 */

const load_labels = () => {  // load ALL labels
    const offset = 8;
    const data_size = dataset.label.dataview.getUint32(4);

    for (let i = 0; i < data_size; i++) {
        // 1-based
        dataset.label.data[i + 1] = dataset.label.dataview.getUint8(offset + i);
    }
};

const load_nth_image = (() => {
    const imageData = context.createImageData(canvas.width, canvas.height);
    let imagedata_on_canvas = imageData.data;  // : Uint8ClampedArray

    return n => {  // n: 1-based
        const offset = 16 + 28 * 28 * (n - 1);

        for (let i = 0; i < 28 * 28; i++) {
            let d = dataset.image.dataview.getUint8(offset + i);
            imagedata_on_canvas[4 * i]
                = imagedata_on_canvas[4 * i + 1]
                = imagedata_on_canvas[4 * i + 2]
                = d;
        }

        context.putImageData(imageData, 0, 0);
    }
})();

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
        $(`#fig-${n} > figcaption`).textContent = `${dataset.label.data[n]}`;
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
            dataset.label.dataview = view;
            $('#label_file').classList.add('loaded');
            load_labels();
        } else if (view.getUint32(0) === 2051) { // image
            dataset.image.dataview = view;
            $('#image_file').classList.add('loaded');
        } else {
            console.log('error: file collapsed.');
        }

        if (dataset.label.loaded && dataset.image.loaded) {
            $('#inputnumber > button').removeAttribute('disabled');
        }
    });

    let files = e.dataTransfer.files;
    let dropped_files = [...files];

    ['label', 'image']
        .filter(key => {
            return !dataset[key].loaded;
        })
        ?.forEach(key => {
            let required_filename = dataset[key].filename;
            dropped_files.forEach(async f => {
                if (f.name === required_filename) {
                    const reader = new FileReader();
                    reader.addEventListener('load', load_handler(reader));
                    reader.readAsArrayBuffer(f);
                    dataset[key].loaded = true;    
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
