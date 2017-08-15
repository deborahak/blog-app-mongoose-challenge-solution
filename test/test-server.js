const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const should = chai.should();
chai.use(chaiHttp);

const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { DATABASE_URL } = require('../config');
const { BlogPost } = require('../models');

//random data to fill blog and test
function seedBlogData() {
    console.info('seeding blog info');
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        })
    }
    return BlogPost.insertMany(seedData);
}

//tear down the database so you can rebuild it and test
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog posts', function() {
    before(function() {
        return runServer(databaseUrl = TEST_DATABASE_URL);
    });
    beforeEach(function() {
        return seedBlogData();
    });
    after(function() {
        mongoose.connection.db.dropDatabase();
        return closeServer();
    });

    describe('GET posts', function() {
        it('should retrieve all existing posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(_res => {
                    res = _res;
                    res.should.have.status(200);
                    res.body.should.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(count => {
                    res.body.should.have.length.of(count);
                });
        });
        it('should return posts with chose fields', function() {
            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.should.have.length.of.at.least(1);

                    res.body.forEach(function(post) {
                        post.should.be.a('object');
                        post.should.include.keys('id', 'title', 'content', 'author', 'created');
                    });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id).exec();
                })
                .then(post => {
                    resPost.title.should.equal(post.title);
                    resPost.content.should.equal(post.content);
                    resPost.author.should.equal(post.authorName);
                });
        });
    });

    describe('POST blog posts', function() {
        it('should create a new blog post on POST', function() {
            const newBlogPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                },
                content: faker.lorem.text()
            };
            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys('id', 'title', 'author', 'content');
                    res.body.title.should.equal(newBlogPost.title);
                    return BlogPost.findById(res.body.id).exec();
                })
                .then(function(post) {

                });
        });
    });

    describe('PUT blog post', function() {
        it('should update fields you change', function() {
            const updateData = {
                title: 'Eating Everything',
                content: 'eat eat eat yum yum yum',
                author: {
                    firstName: 'Holly',
                    lastName: 'Dog'
                }
            };

            return BlogPost
                .findOne()
                .exec()
                .then(post => {
                    updateData.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(res => {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.title.should.equal(updateData.title);
                    res.body.author.should.equal(
                        `${updateData.author.firstName} ${updateData.author.lastName}`);
                    res.body.content.should.equal(updateData.content);

                    return BlogPost.findById(res.body.id).exec();
                })
                .then(post => {
                    post.title.should.equal(updateData.title);
                    post.content.should.equal(updateData.content);
                    post.author.firstName.should.equal(updateData.author.firstName);
                    post.author.lastName.should.equal(updateData.author.lastName);
                });
        });
    });
    describe('DELETE blog posts', function() {
        it('should delete a post by id', function() {
            let post;
            return BlogPost
                .findOne()
                .exec()
                .then(_post => {
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(res => {
                    res.should.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(_post => {
                    should.not.exist(_post);
                });
        });
    });

});