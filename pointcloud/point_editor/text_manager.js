/**
 * 文字管理模块
 * 负责文字对象的创建和管理
 */

import { TextObject } from './text_point_cloud.js';


export class TextManager {
    constructor() {
        this.texts = [];
    }

    /**
     * 添加文字
     */
    addText(textValue, font, scene, transformControls, mouseControlEnabled) {
        if (!textValue) {
            throw new Error('请输入文字内容');
        }

        try {
            // 创建文字对象
            const textPosition = {
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                z: (Math.random() - 0.5) * 40
            };

            const textObject = new TextObject(textValue, {
                size: 20,
                position: textPosition,
                color: 0xff0000,  // 红色文字
                font: font  // 添加字体选项
            });
            
            // 设置场景引用
            textObject.setScene(scene);

            // 添加到场景
            scene.add(textObject.getMesh());

            // 如果鼠标控制已启用，附加TransformControls到新添加的文字对象
            if (mouseControlEnabled && transformControls) {
                transformControls.attach(textObject.getMesh());
            }

            // 保存到texts数组
            const textObj = {
                id: Date.now(), // 简单的ID生成方式
                value: textValue,
                textObject: textObject,
                element: null, // 对应的DOM元素
                transformControls: transformControls, // 保存TransformControls引用
                mouseControlEnabled: mouseControlEnabled // 保存鼠标控制状态
            };

            this.texts.push(textObj);

            return textObj;

        } catch (error) {
            console.error('添加文字时出错:', error);
            throw error;
        }
    }

    /**
     * 放大文字
     */
    enlargeText(index) {
        if (index >= 0 && index < this.texts.length) {
            const textObj = this.texts[index];
            // 获取当前大小
            const currentSize = textObj.textObject.options.size;
            // 增大10%
            const newSize = currentSize * 1.1;

            // 更新大小
            textObj.textObject.setSize(newSize);
            
            // 重新附加TransformControls到新的mesh
            if (textObj.mouseControlEnabled && textObj.transformControls) {
                textObj.transformControls.attach(textObj.textObject.getMesh());
            }

            return { textValue: textObj.value, newSize: newSize.toFixed(2) };
        }
        throw new Error('无效的文字索引');
    }

    /**
     * 缩小文字
     */
    shrinkText(index) {
        if (index >= 0 && index < this.texts.length) {
            const textObj = this.texts[index];
            // 获取当前大小
            const currentSize = textObj.textObject.options.size;
            // 减小10%
            const newSize = currentSize * 0.9;

            // 更新大小
            textObj.textObject.setSize(newSize);
            
            // 重新附加TransformControls到新的mesh
            if (textObj.mouseControlEnabled && textObj.transformControls) {
                textObj.transformControls.attach(textObj.textObject.getMesh());
            }

            return { textValue: textObj.value, newSize: newSize.toFixed(2) };
        }
        throw new Error('无效的文字索引');
    }

    /**
     * 删除文字
     */
    removeText(index, scene) {
        if (index >= 0 && index < this.texts.length) {
            const textObj = this.texts[index];

            // 从场景中移除文字对象
            if (textObj.textObject && textObj.textObject.getMesh()) {
                // 如果TransformControls正在控制这个对象，先取消控制
                if (textObj.transformControls && textObj.transformControls.object === textObj.textObject.getMesh()) {
                    textObj.transformControls.detach();
                }
                scene.remove(textObj.textObject.getMesh());
            }

            // 从数组中移除
            this.texts.splice(index, 1);

            // 刷新文字列表以更新DOM和索引
            this.refreshTextList();

            return true;
        }
        throw new Error('无效的文字索引');
    }

    /**
     * 清除所有文字
     */
    clearTexts() {
        // 保存当前的场景引用
        const scene = window.app.scene;

        // 从后往前遍历并删除所有文字
        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.removeText(i, scene);
        }

        // 确保数组为空
        this.texts = [];
    }

    /**
     * 选中文字对象
     */
    selectText(index, transformControls, mouseControlEnabled) {
        if (index >= 0 && index < this.texts.length) {
            const textObj = this.texts[index];

            // 如果鼠标控制已启用，附加TransformControls到选中的文字对象
            if (mouseControlEnabled && transformControls) {
                transformControls.attach(textObj.textObject.getMesh());
                return textObj.value;
            } else {
                throw new Error('请先启用鼠标拖拽移动功能');
            }
        }
        throw new Error('无效的文字索引');
    }

    /**
     * 获取所有文字的点云数据
     */
    getAllPointCloudData() {
        const allPoints = [];
        let textPointsCount = 0;

        for (const textObj of this.texts) {
            if (textObj.textObject) {
                const textPositions = textObj.textObject.getPointCloudData();
                // 使用循环添加而不是扩展运算符，避免调用栈溢出
                for (let i = 0; i < textPositions.length; i++) {
                    allPoints.push(textPositions[i]);
                }
                textPointsCount += textPositions.length / 3;
            }
        }

        return { points: allPoints, count: textPointsCount };
    }

    /**
     * 获取文字列表
     */
    getTexts() {
        return this.texts;
    }

    /**
     * 创建文字列表元素
     */
    createTextElement(textValue, index) {
        const textItem = document.createElement('div');
        textItem.className = 'text-item';
        textItem.innerHTML = `
            <span>${textValue}</span>
            <div>
                <button class="enlarge-btn" data-index="${index}">+</button>
                <button class="shrink-btn" data-index="${index}">-</button>
                <button class="remove-btn" data-index="${index}">×</button>
                <button class="select-btn" data-index="${index}">选中</button>
            </div>
        `;
        
        // 添加事件监听器
        textItem.querySelector('.enlarge-btn').addEventListener('click', () => {
            try {
                const result = this.enlargeText(index);
                console.log(`文字 "${result.textValue}" 已放大到 ${result.newSize}`);
            } catch (error) {
                console.error('放大文字时出错:', error);
            }
        });
        
        textItem.querySelector('.shrink-btn').addEventListener('click', () => {
            try {
                const result = this.shrinkText(index);
                console.log(`文字 "${result.textValue}" 已缩小到 ${result.newSize}`);
            } catch (error) {
                console.error('缩小文字时出错:', error);
            }
        });
        
        textItem.querySelector('.remove-btn').addEventListener('click', () => {
            try {
                // 需要获取场景对象
                const scene = window.app.scene;
                const result = this.removeText(index, scene);
                if (result) {
                    // 重新创建文字列表以更新索引
                    this.refreshTextList();
                    console.log('文字已删除');
                }
            } catch (error) {
                console.error('删除文字时出错:', error);
            }
        });
        
        textItem.querySelector('.select-btn').addEventListener('click', () => {
            try {
                const transformControls = window.app.transformControls;
                const mouseControlEnabled = window.app.mouseControlEnabled;
                const result = this.selectText(index, transformControls, mouseControlEnabled);
                console.log(`已选中文字: ${result}`);
            } catch (error) {
                console.error('选中文字时出错:', error);
            }
        });
        
        return textItem;
    }

    /**
     * 刷新文字列表以更新索引
     */
    refreshTextList() {
        const textList = document.getElementById('textList');
        if (!textList) return;
        
        // 清空列表
        textList.innerHTML = '';
        
        // 重新创建所有文字元素
        this.texts.forEach((textObj, index) => {
            const textItem = this.createTextElement(textObj.value, index);
            textObj.element = textItem;
            textList.appendChild(textItem);
        });
    }

    /**
     * 通过索引放大文字（供外部调用）
     */
    enlargeTextByIndex(index) {
        try {
            const result = this.enlargeText(index);
            // 刷新文字列表
            this.refreshTextList();
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 通过索引缩小文字（供外部调用）
     */
    shrinkTextByIndex(index) {
        try {
            const result = this.shrinkText(index);
            // 刷新文字列表
            this.refreshTextList();
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 通过索引删除文字（供外部调用）
     */
    removeTextByIndex(index) {
        try {
            // 需要获取场景对象
            const scene = window.app.scene;
            // removeText 内部已经会调用 refreshTextList()
            return this.removeText(index, scene);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 通过索引选中文字（供外部调用）
     */
    selectTextByIndex(index) {
        try {
            const transformControls = window.app.transformControls;
            const mouseControlEnabled = window.app.mouseControlEnabled;
            const result = this.selectText(index, transformControls, mouseControlEnabled);
            return result;
        } catch (error) {
            throw error;
        }
    }
}