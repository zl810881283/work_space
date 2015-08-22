/**
 * Created by zl on 2015/8/16.
 */
var express = require('express');
var router = express.Router();
var moment = require('moment');
var fs=require('fs');
var uuid = require('node-uuid');
var multer=require('multer');
var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var ObjectId=mongoose.Schema.Types.ObjectId;

var User=require('../model/User');
var Article=require('../model/Article');
var ArticleClass=require('../model/ArticleClass');
var ArticleKeyword=require('../model/ArticleKeyword');
var Comment=require('../model/Comment');

var printObject=require('../utils/printObject');

var storage=multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/picture/')
    },
    filename: function (req, file, cb) {
        cb(null, uuid.v1()+"."+file.mimetype.match(/[^\/]+$/)[0]);
    }
});

var upload =multer({ storage: storage });

//router.get('/addClassKeyword',function(req,res,next){
//    var clazz=['生活','学习','文学','开发','编程'];
//    var keyword=['shell','javascript','html5','多线程','nodejs','jade','机器学习','logistic回归','线性回归','makefile','贝叶斯分类','ACM','编译原理','hashMap','广度优先搜索','socket','UDP'];
//    for(var item in clazz){
//        var i=new ArticleClass({
//            name:clazz[item],
//            desc:"init"
//        });
//        i.save();
//    }
//
//    for(var item in keyword){
//        var i=new ArticleKeyword({
//            name:keyword[item],
//            desc:"init"
//        });
//        i.save();
//    }
//});

router.use(function(req,res,next){
    req.local.breadcrumb=" / 文章 / ";

    Article.findHotTop(function(err,articles){
        if(err)
            return next(err);
        req.local.hotArticles=articles;
        next();
    })


});

router.get('/add',function(req,res,next){
    ArticleClass.fetch(function(err,classes){
        if(err)
            return next(err);
        ArticleKeyword.fetch(function(err,keywords){
            if(err)
                return next(err);

            req.local.classes=classes;
            req.local.keywords=keywords;
            req.local.title='添加文章';
            res.render('article/add',req.local);
        });
    });
});

router.post('/add',upload.single('article[picture]'),function(req,res,next){
    var _article=req.body.article;
    var keywords=_article.keywords;
    if(typeof _article.keywords === "string"){
        keywords=[keywords];
    }

    var path=""
    if(req.file)
        path=req.file.path;

    var article=new Article({
        author:req.session.user._id,
        title:_article.title,
        content:_article.content,
        picturePath:path.replace(/\\/g,'/'),
        clazz:_article.clazz,
        keywords:keywords
    });


    article.save(function(err){
        if(err)
            return next(err);
        console.log('save success')
        res.redirect('/article/detail/'+article._id);
    });
});

router.get('/detail/:aid',function(req,res,next){
    Article.findById(req.params.aid,function(err,article){
        if(err)
            return next(err);
        if(!article)
            return next();
        article.populate('author')
            .populate('clazz')
            .populate(function(err,article){
                if(err){
                    return next(err);
                }

                article.meta._updateAt=moment(article.meta.updateAt).format('l');
                article.meta._createAt=moment(article.meta.createAt).format('l');
                article._picturePath=article.picturePath.replace(/^\w+\//,"");

                req.local.article=article;
                req.local.breadcrumb+=article.title;

                Comment.findByArticle(article._id,function(err,comments){
                    if(err)
                        return next(err);
                    var _comments=[];
                    var map={};
                    var count=0;
                    for(var i in comments){
                        comments[i].child=[];

                        //TODO: replace the word \n
                        //comments[i].content.replace(/\n/g,"<br/>");

                        if(!comments[i].reply){
                            map[comments[i]._id]=count;
                            _comments[count++]=comments[i];
                        }

                    }
                    for(var i in comments){
                        if(comments[i].reply){
                            _comments[map[comments[i].reply]].child.push(comments[i]);
                        }
                    }

                    req.local.comments=_comments;

                    res.render('article/detail',req.local,function(err,html){
                        if(err){
                            return next(err);
                        }
                        res.send(html);
                        res.end();

                        article.clickTimes++;
                        article.keepUpdateTime=true;
                        article.save();
                    });
                });

        });
    });
});

router.get('/modify/:aid',function(req,res,next){

});

router.post('/modify/:aid',function(req,res,next){

});

router.get('/delete/:aid',function(req,res,next){

});

module.exports=router;